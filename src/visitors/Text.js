// @flow

import type Context from '../context';
import t from '../babel-types';
import {
  INTERPOLATION_REFERENCE_REGEX,
  getInterpolationRefs,
} from '../utils/interpolation';

const TextVisitor = {
  jsx(node: Object, context: Context) {

    const refs = getInterpolationRefs(node.val);

    if (!refs) {
      return t.jSXText(node.val);
    }

    const splitText = node.val.split(INTERPOLATION_REFERENCE_REGEX);

    if (refs.length === 1 && splitText.every((text) => text === '')) {
      const ref = context.getInterpolationByRef(refs[0]);

      return t.jSXExpressionContainer(ref || t.nullLiteral());
    }

    const textArr = splitText.reduce((arr, value, index) => {

      const valueArr = value ? [t.stringLiteral(value)] : [];
      const interpolation = refs[index] ? context.getInterpolationByRef(refs[index]) : null;

      if (interpolation) {
        valueArr.push(interpolation);
      }

      return arr.concat(valueArr);

    }, []);

    return t.jSXExpressionContainer(
      t.callExpression(
        t.memberExpression(
          t.arrayExpression(textArr),
          t.identifier('join')
        ),
        [
          t.stringLiteral(''),
        ]
      )
    );

  },
  expression(node: Object, context: Context) {
    return t.stringLiteral(node.val);
  },
};

export default TextVisitor;
