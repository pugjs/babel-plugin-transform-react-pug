// @flow

import type Context from '../context';
import parseExpression from '../utils/parse-expression';
import t from '../babel-types';
import {visitJsx} from '../visitors';
import {
  INTERPOLATION_REFERENCE_REGEX,
  getInterpolationRefs,
} from '../utils/interpolation';

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

      const expr = parseExpression(val === true ? 'true' : val, context);

      if (!mustEscape && (!t.isStringLiteral(expr) || /(\<\>\&)/.test(val))) {
        throw new Error('Unescaped attributes are not supported in react-pug');
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

  let name = node.name;
  const children = getChildren(node, context);

  if (node.attributeBlocks.length) {
    throw new Error('Attribute blocks are not yet supported in react-pug');
  }

  const attrs = getAttributes(node, context);
  context.key.handleAttributes(attrs);

  /**
   * Check whether an interpolation reference exists, handle
   * whether the interpolation is a valid component or jsx
   * value.
   */
  if (getInterpolationRefs(node.name)) {
    const interpolation = context.getInterpolationByRef(node.name);
    const isReactComponent = interpolation.name && interpolation.name.charAt(0) === interpolation.name.charAt(0).toUpperCase();

    if (children.length || attrs.length) {
      if (isReactComponent) {
        name = interpolation.name;
      } else {
        throw new Error('Only components can have attributes and children');
      }
    }

    if (isReactComponent) {
      name = interpolation.name;
    } else {
      return t.jSXExpressionContainer(interpolation);
    }
  }

  const tagName = t.jSXIdentifier(name);

  const open = t.jSXOpeningElement(
    tagName,
    attrs, // Array<JSXAttribute | JSXSpreadAttribute>
    children.length === 0,
  );

  const close = (
    children.length === 0
    ? null
    : t.jSXClosingElement(tagName)
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
    return build(node, context);
  },
  expression(node: Object, context: Context) {
    return build(node, context);
  },
};

export default TagVisitor;
