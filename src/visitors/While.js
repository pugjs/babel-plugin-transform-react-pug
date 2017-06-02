// @flow

import parseExpression from '../utils/parse-expression';
import type Context from '../context';
import t from '../babel-types';
import {visitExpression} from '../visitors';

function getWhileStatement(node: Object, context: Context, id: Identifier): Statement {
  const test = parseExpression(node.test, context);
  const {result: body, variables} = context.dynamicBlock((childContext: Context) => {
    return node.block.nodes.map(n => t.expressionStatement(
      t.assignmentExpression(
        '=',
        t.memberExpression(
          id,
          t.memberExpression(id, t.identifier('length')),
          true
        ),
        visitExpression(n, context),
      ),
    ));
  });
  if (variables.length) {
    body.unshift(t.variableDeclaration(
      'let',
      variables.map(id => t.variableDeclarator(id))
    ))
  }
  return t.whileStatement(test, t.blockStatement(body));
}
const WhileVisitor = {
  expression(node: Object, context: Context): Expression {
    const id = context.generateUidIdentifier('pug_nodes');
    return t.callExpression(
      t.arrowFunctionExpression(
        [id],
        t.blockStatement([getWhileStatement(node, context, id), t.returnStatement(id)])
      ),
      [t.arrayExpression([])],
    );
  },
};

export default WhileVisitor;
