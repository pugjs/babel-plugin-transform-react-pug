// @flow

import type Context from '../context';
import parse from './parse';
import addLocToAst from './add-loc-to-ast';
import t from '../babel-types';
import {
  INTERPOLATION_REFERENCE_REGEX,
  getInterpolationRefs,
} from './interpolation';

export default function parseExpression(src: string, context: Context): Expression {

  if (getInterpolationRefs(src)) {
    const matched = src.split(INTERPOLATION_REFERENCE_REGEX);
    const isInterpolation = matched.every(text => text === '');

    if (!isInterpolation) {
      const errMsg = matched.length === 1
        ? `Interpolation does not exist for ${src}`
        : 'You can o';
      throw context.error('INVALID_EXPRESSION', errMsg);
    }

    return context.getInterpolationByRef(src);
  }

  const val = parse('x = (' + src + ');', context);

  if (val.length !== 1) {
    const err = context.error('INVALID_EXPRESSION', `There was an error parsing the expression ${src}.`);
    throw err;
  }

  const expressionStatement = t.asExpressionStatement(val[0]);

  const assignmentExpression = expressionStatement && t.asAssignmentExpression(expressionStatement.expression);

  if (!assignmentExpression) {
    const err = context.error('INVALID_EXPRESSION', `There was an error parsing the expression ${src}.`);
    throw err;
  }

  addLocToAst(assignmentExpression);
  return assignmentExpression.right;
}
