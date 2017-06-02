// @flow

import parseExpression from '../utils/parse-expression';
import type Context from '../context';
import t from '../babel-types';
import {visitExpression} from '../visitors';

function getLoop(node: Object, context: Context, id: Identifier, arrayToIterateOver: Identifier, arrayLength: MemberExpression): Statement {
  const index = node.key ? t.identifier(node.key) : context.generateUidIdentifier('pug_index');
  const init = t.variableDeclaration(
    'let',
    [
      t.variableDeclarator(
        index,
        t.numericLiteral(0),
      ),
    ],
  );
  const test = t.binaryExpression(
    '<',
    index,
    arrayLength,
  );
  const update = t.updateExpression(
    '++',
    index
  );
  const {result: body, variables} = context.dynamicBlock(
    childContext => [
      t.variableDeclaration(
        'const',
        [
          t.variableDeclarator(
            t.identifier(node.val),
            t.memberExpression(
              arrayToIterateOver,
              index,
              true,
            ),
          ),
        ],
      ),
    ].concat(
      node.block.nodes.map(
        n => t.expressionStatement(
          t.assignmentExpression(
            '=',
            t.memberExpression(
              id,
              t.memberExpression(id, t.identifier('length')),
              true
            ),
            visitExpression(n, childContext),
          ),
        ),
      ),
    )
  );
  if (variables.length) {
    body.unshift(t.variableDeclaration(
      'let',
      variables.map(id => t.variableDeclarator(id))
    ))
  }
  return t.forStatement(init, test, update, t.blockStatement(body));
}

function getAlternate(node: Object, context: Context): Expression {
  return context.staticBlock((childContext: Context): Expression => {
    const children = (node.alternate ? node.alternate.nodes : []).map(n => visitExpression(n, childContext));
    if (children.length === 0) {
      return t.identifier('undefined');
    }
    if (children.length === 1) {
      return children[0];
    }
    return t.arrayExpression(children);
  });
}
function getTypeErrorTest(node: Object, context: Context, arrayToIterateOver: Identifier): Statement {
  return t.ifStatement(
    t.unaryExpression(
      '!',
      t.logicalExpression(
        '||',
        t.binaryExpression('==', arrayToIterateOver, t.nullLiteral()),
        t.callExpression(
          t.memberExpression(t.identifier('Array'), t.identifier('isArray')),
          [arrayToIterateOver]
        )
      ),
    ),
    t.throwStatement(
      t.newExpression(
        t.identifier('Error'),
        [t.stringLiteral('Expected "' + node.obj + '" to be an array because it is passed to each.')],
      ),
    ),
  );
}

const WhileVisitor = {
  expression(node: Object, context: Context): Expression {
    const id = context.generateUidIdentifier('pug_nodes');

    const arrayToIterateOver = context.generateUidIdentifier('pug_arr');
    const arrayLength = t.memberExpression(
      arrayToIterateOver,
      t.identifier('length'),
    );

    const typeErrorTest = getTypeErrorTest(node, context, arrayToIterateOver);
    const loop = getLoop(node, context, id, arrayToIterateOver, arrayLength);
    const alternate = getAlternate(node, context);

    const body = t.blockStatement([
      typeErrorTest,
      t.ifStatement(
        t.logicalExpression(
          '||',
          t.binaryExpression('==', arrayToIterateOver, t.nullLiteral()),
          t.binaryExpression('===', arrayLength, t.numericLiteral(0)),
        ),
        t.returnStatement(alternate),
      ),
      loop,
      t.returnStatement(id),
    ]);

    return t.callExpression(
      t.arrowFunctionExpression(
        [id, arrayToIterateOver],
        body,
      ),
      [t.arrayExpression([]), parseExpression(node.obj, context)]
    );
  },
};

export default WhileVisitor;
