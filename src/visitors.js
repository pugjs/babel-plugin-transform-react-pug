// @flow

import type Context from './context';
import t, {setCurrentLocation} from './lib/babel-types';
import visitors from './lib/visitors.js';

export function visitExpressions(
  nodes: Object[],
  context: Context,
): Expression[] {
  const result = [];
  nodes.forEach((node, i) => {
    if (node.type === 'Block') {
      result.push(...visitExpressions(node.nodes, context));
    } else {
      result.push(visitExpression(node, context));
    }
  });
  return result;
}
export function visitExpression(node: Object, context: Context): Expression {
  const line = node.line + context.getBaseLine();
  setCurrentLocation({start: {line, column: 0}, end: {line, column: 0}});
  const v = visitors[node.type];
  if (!v) {
    throw new Error(node.type + ' is not yet supported');
  }
  return v.expression(node, context);
}
export function visitJsxExpressions(
  nodes: Object[],
  context: Context,
): JSXValue[] {
  const result = [];
  nodes.forEach((node, i) => {
    if (node.type === 'Block') {
      result.push(...visitJsxExpressions(node.nodes, context));
    } else {
      result.push(visitJsx(node, context));
    }
  });
  return result;
}
export function visitJsx(node: Object, context: Context): JSXValue {
  const line = node.line + context.getBaseLine();
  setCurrentLocation({start: {line, column: 0}, end: {line, column: 0}});
  const v = visitors[node.type];
  if (!v) {
    throw new Error(node.type + ' is not yet supported');
  }
  return v.jsx
    ? v.jsx(node, context)
    : t.jSXExpressionContainer(v.expression(node, context));
}
