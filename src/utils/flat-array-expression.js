// @flow

import t from '../lib/babel-types';

export default function flatArrayExpression(
  list: Array<Object>,
): Array<Object> {
  return list.reduce((result, item) => {
    if (t.isArrayExpression(item)) {
      result.push(...flatArrayExpression(item.elements));
    } else {
      result.push(item);
    }

    return result;
  }, []);
}
