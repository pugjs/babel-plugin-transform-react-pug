// @flow

import type Context from '../context';
import t from '../babel-types';
import {isInterpolationRef} from '../utils/interpolation';

const TextVisitor = {
  jsx(node: Object, context: Context) {
    
    if (isInterpolationRef(node.val)) {
      let ref = context.getInterpolationByRef(node.val);
      if (ref) {
        return t.jSXExpressionContainer(ref);    
      }
    }  
      
    return t.jSXText(node.val);
  },
  expression(node: Object, context: Context) {
    return t.stringLiteral(node.val);
  },
};

export default TextVisitor;
