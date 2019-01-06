// @flow

import parseExpression from '../utils/parse-expression';
import {buildJSXFragment} from '../utils/jsx';
import type Context from '../context';
import t from '../lib/babel-types';
import {visitExpressions} from '../visitors';

function convertCases(
  nodes: Array<Object>,
  context: Context,
  needle: Identifier,
): Expression {
  if (nodes.length === 0) {
    return t.identifier('null');
  }
  const node = nodes[0];
  const consequent = context.staticBlock(
    (childContext: Context): Expression => {
      const children = visitExpressions(node.block.nodes, childContext);
      if (children.length === 1) {
        return children[0];
      }
      if (children.length === 0) {
        return t.identifier('null');
      }
      return buildJSXFragment(children);
    },
  );
  if (node.expr === 'default') {
    return consequent;
  }
  const test = t.binaryExpression(
    '===',
    needle,
    parseExpression(node.expr, context),
  );
  const alternate = convertCases(nodes.slice(1), context, needle);
  return t.conditionalExpression(test, consequent, alternate);
}

const ConditionalVisitor = {
  expression(node: Object, context: Context): Expression {
    const needle = parseExpression(node.expr, context);
    const id =
      t.asIdentifier(needle) ||
      context.declareVariable(
        'const',
        context.generateUidIdentifier('case_variable').name,
      ).id;
    const cases = convertCases(node.block.nodes, context, id);
    if (!t.isIdentifier(needle)) {
      return t.sequenceExpression([
        t.assignmentExpression('=', id, needle),
        cases,
      ]);
    }
    return cases;
  },
};
export default ConditionalVisitor;
