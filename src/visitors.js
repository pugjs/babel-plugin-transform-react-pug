// @flow

import type Context from './context';
import t, {setCurrentLocation} from './babel-types';
import visitors from './visitors.generated.js';

export function visitExpression(node: Object, context: Context): Expression {
  const line = node.line + context.getBaseLine();
  setCurrentLocation({start: {line, column: 0}, end: {line, column: 0}});
  const v = visitors[node.type];
  if (!v) {
    throw new Error(node.type + ' is not yet supported');
  }
  return v.expression(node, context);
}
export function visitJsx(node: Object, context: Context): JSXValue {
  const v = visitors[node.type];
  if (!v) {
    throw new Error(node.type + ' is not yet supported');
  }
  return v.jsx ? v.jsx(node, context) : t.jSXExpressionContainer(v.expression(node, context));
}
