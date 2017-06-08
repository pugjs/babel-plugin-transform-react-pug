// @flow

import type Context from '../context';
import parseExpression from '../utils/parse-expression';
import t from '../babel-types';
import {visitJsx} from '../visitors';
import {getInterpolationRefs} from '../utils/interpolation';

function getChildren(node: Object, context: Context): Array<JSXValue> {
  return context.noKey(childContext => (
    (
      node.code ?
      [visitJsx(node.code, childContext)] :
      []
    ).concat(node.block.nodes.map(
      node => visitJsx(node, childContext)
    ))
  ));
}

function getAttributes(node: Object, context: Context): Array<JSXAttribute | JSXSpreadAttribute> {
  const classes = [];
  const attrs = node.attrs.map(
    ({name, val, mustEscape}) => {

      if (/\.\.\./.test(name) && val === true) {
        return t.jSXSpreadAttribute(parseExpression(name.substr(3), context));
      }

      switch (name) {
        case 'for':
          name = 'htmlFor';
          break;
        case 'maxlength':
          name = 'maxLength';
          break;
        case 'class':
          name = 'className';
          break;
      }

      let expr;

      if (getInterpolationRefs(val)) {
        const interpolation = context.getInterpolationByRef(val);
        expr = interpolation;
      } else {
        expr = parseExpression(val === true ? 'true' : val, context);
        if (!mustEscape && (!t.isStringLiteral(expr) || /(\<\>\&)/.test(val))) {
          throw new Error('Unescaped attributes are not supported in react-pug');
        }
      }

      if (expr == null) {
        return null;
      }

      if (name === 'className') {
        classes.push(expr);
        return null;
      }

      const jsxValue = (
        t.asStringLiteral(expr) ||
        t.asJSXElement(expr) ||
        t.jSXExpressionContainer(expr)
      );

      if (/\.\.\./.test(name)) {
        throw new Error('spread attributes must not have a value');
      }

      return t.jSXAttribute(
        t.jSXIdentifier(name),
        jsxValue,
      );
    },
  ).filter(Boolean);
  if (classes.length) {
    const value = (
      classes.every(cls => t.isStringLiteral(cls))
      ? t.stringLiteral(classes.map(cls => (cls: any).value).join(' '))
      : (
        t.jSXExpressionContainer(
          t.callExpression(
            t.memberExpression(
              t.arrayExpression(classes),
              t.identifier('join'),
            ),
            [
              t.stringLiteral(' '),
            ],
          ),
        )
      )
    );
    attrs.push(t.jSXAttribute(t.jSXIdentifier('className'), value));
  }
  return attrs;
}

function build(node: Object, context: Context): JSXElement {

  const name = t.jSXIdentifier(node.name);
  const children = getChildren(node, context);
  if (node.attributeBlocks.length) {
    throw new Error('Attribute blocks are not yet supported in react-pug');
  }
  const attrs = getAttributes(node, context);
  context.key.handleAttributes(attrs);

  const open = t.jSXOpeningElement(
    name,
    attrs, // Array<JSXAttribute | JSXSpreadAttribute>
    children.length === 0,
  );

  const close = (
    children.length === 0
    ? null
    : t.jSXClosingElement(name)
  );

  return t.jSXElement(
    open,
    close,
    children,
    children.length === 0
  );
}

const TagVisitor = {
  jsx(node: Object, context: Context) {

    if (getInterpolationRefs(node.name)) {
      const expr = context.getInterpolationByRef(node.name);
      if (expr) {
        return t.jSXExpressionContainer(expr);
      }
    }  
 
    return build(node, context);
  },
  expression(node: Object, context: Context) {
    return build(node, context);
  },
};

export default TagVisitor;
