// @flow

import t from '../lib/babel-types';

export default function addString(
  node: Expression,
  rStr: StringLiteral,
): Expression {
  t.assertStringLiteral(rStr);
  const lStr = t.asStringLiteral(node);
  if (lStr) {
    return t.stringLiteral(lStr.value + rStr.value);
  }
  const lBinary = t.asBinaryExpression(node, {operator: '+'});
  if (lBinary) {
    const lStr = t.asStringLiteral(lBinary.right);
    if (lStr) {
      return t.binaryExpression('+', lBinary.left, addString(lStr, rStr));
    }
  }
  return t.binaryExpression('+', node, rStr);
}
