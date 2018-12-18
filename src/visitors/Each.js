// @flow

import parseExpression from '../utils/parse-expression';
import type Context from '../context';
import t from '../lib/babel-types';
import {visitExpressions} from '../visitors';

function getAlternate(node: Object, context: Context): Expression {
  return context.staticBlock(
    (childContext: Context): Expression => {
      const children = visitExpressions(
        node.alternate ? node.alternate.nodes : [],
        childContext,
      );
      if (children.length === 0) {
        return t.identifier('undefined');
      }
      if (children.length === 1) {
        return children[0];
      }
      return t.arrayExpression(children);
    },
  );
}

const getBody = (node: Object, context: Context): Expression => {
  const bodyContent = [];

  const {result, variables} = context.dynamicBlock(
    (childContext: Context): Expression =>
      visitExpressions(node.block.nodes, childContext),
  );

  if (variables.length) {
    bodyContent.unshift(
      t.variableDeclaration(
        'let',
        variables.map(id => t.variableDeclarator(id)),
      ),
    );
  }

  if (result.length > 1) {
    bodyContent.push(t.returnStatement(t.arrayExpression(result)));
  } else {
    bodyContent.push(t.returnStatement(result[0]));
  }

  return t.blockStatement(bodyContent);
};

const WhileVisitor = {
  expression(node: Object, context: Context): Expression {
    const bodyArgs = [t.identifier(node.val)];

    if (node.key) {
      bodyArgs.push(t.identifier(node.key));
    }

    const list = parseExpression(node.obj, context);

    const callExpression = t.callExpression(
      t.memberExpression(list, t.identifier('map')),
      [t.arrowFunctionExpression(bodyArgs, getBody(node, context))],
    );

    if (node.alternate) {
      return t.conditionalExpression(
        t.logicalExpression(
          '&&',
          t.callExpression(
            t.memberExpression(t.identifier('Array'), t.identifier('isArray')),
            [list],
          ),
          t.memberExpression(list, t.identifier('length')),
        ),
        callExpression,
        getAlternate(node, context),
      );
    }

    return callExpression;
  },
};

export default WhileVisitor;
