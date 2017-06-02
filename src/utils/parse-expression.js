// @flow

import type Context from '../context';
import parse from './parse';
import addLocToAst from './add-loc-to-ast';
import t from '../babel-types';

export default function parseExpression(src: string, context: Context): Expression {
  const val = parse('x = (' + src + ');', context);
  if (val.length !== 1) {
    const err = context.error('INVALID_EXPRESSION', 'There was an error parsing the expression "' + src + '".');
    throw err;
  }
  const expressionStatement = t.asExpressionStatement(val[0]);
  const assignmentExpression = expressionStatement && t.asAssignmentExpression(expressionStatement.expression);
  if (!assignmentExpression) {
    const err = context.error('INVALID_EXPRESSION', 'There was an error parsing the expression "' + src + '".');
    throw err;
  }
  addLocToAst(assignmentExpression);
  return assignmentExpression.right;
}
