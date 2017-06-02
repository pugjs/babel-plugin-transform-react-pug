// @flow

import type Context from '../context';
import t from '../babel-types';

const TextVisitor = {
  jsx(node: Object, context: Context) {
    return t.jSXText(node.val);
  },
  expression(node: Object, context: Context) {
    return t.stringLiteral(node.val);
  },
};

export default TextVisitor;
