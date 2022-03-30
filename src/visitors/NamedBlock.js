// @flow

import type Context from '../context';
import {visitJsxExpressions} from '../visitors';
import {buildJSXFragment} from '../utils/jsx';

const NamedBlockVisitor = {
  jsx(node: Object, context: Context): JSXValue {
    const nodes = visitJsxExpressions(node.nodes, context);
    node.nodes = nodes.length === 1 ? nodes : [buildJSXFragment(nodes)];
    return node;
  },
};

export default NamedBlockVisitor;
