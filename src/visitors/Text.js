// @flow

import type Context from '../context';
import t from '../lib/babel-types';
import sanitizeText from '../utils/sanitize-text';
import {
  INTERPOLATION_REFERENCE_REGEX,
  getInterpolationRefs,
} from '../utils/interpolation';

/**
 * Find interpolation references in the text
 * and interweave the text with interpolations.
 * @param {string} value - The value to interpolate
 * @param {Array<string>} refs - The array of references
 * @param {Context} context - The context of the expression.
 * @returns {Expression} The interpolation or an array containing
 * text and interpolations.
 */
function buildInterpolation(
  value: string,
  refs: Array<string>,
  context: Context,
): Expression {
  const splitText = value.split(INTERPOLATION_REFERENCE_REGEX);

  if (refs.length === 1 && splitText.every(text => text === '')) {
    const ref = context.getInterpolationByRef(refs[0]);
    return ref || t.nullLiteral();
  }

  const textArr = splitText.reduce((arr, value, index) => {
    const valueArr = value ? [t.stringLiteral(value)] : [];
    const interpolation = refs[index]
      ? context.getInterpolationByRef(refs[index])
      : null;

    if (interpolation) {
      valueArr.push(interpolation);
    }

    return arr.concat(valueArr);
  }, []);

  return t.callExpression(
    t.memberExpression(t.arrayExpression(textArr), t.identifier('join')),
    [t.stringLiteral('')],
  );
}

const TextVisitor = {
  jsx({val}: {val: string}, context: Context) {
    const refs = getInterpolationRefs(val);

    if (refs) {
      const expr = buildInterpolation(val, refs, context);
      return t.jSXExpressionContainer(expr);
    }

    if (/^\s/.test(val) || /\s$/.test(val)) {
      return t.jSXExpressionContainer(t.stringLiteral(val));
    }

    const content = sanitizeText(val);

    return t.jSXText(content);
  },
  expression({val}: {val: string}, context: Context) {
    const refs = getInterpolationRefs(val);

    if (refs) {
      return buildInterpolation(val, refs, context);
    }

    return t.stringLiteral(val);
  },
};

export default TextVisitor;
