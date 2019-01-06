// @flow

import t from '../lib/babel-types';

type JSXChildren = Array<
  JSXText | JSXExpressionContainer | JSXSpreadChild | JSXElement,
>;

export function buildJSXElement(
  tag: JSXIdentifier | JSXMemberExpression,
  attrs: Array<JSXAttribute | JSXSpreadAttribute>,
  children: JSXChildren,
): JSXElement {
  const noChildren = children.length === 0;

  const open = t.jSXOpeningElement(tag, attrs, noChildren);

  const close = noChildren ? null : t.jSXClosingElement(tag);

  return t.jSXElement(open, close, children, noChildren);
}

const isAllowedChild = item =>
  [
    'JSXText',
    'JSXExpressionContainer',
    'JSXSpreadChild',
    'JSXElement',
  ].includes(item.type);

// TODO: This can be replaced when migrating to Babel 7 as JSXFragment
// has been added in v7.0.0-beta.30.
export function buildJSXFragment(children: Array<any>): JSXElement {
  const fragmentExpression = t.jSXMemberExpression(
    t.jSXIdentifier('React'),
    t.jSXIdentifier('Fragment'),
  );

  const jSXChildren = children.map(item => {
    if (!isAllowedChild(item)) {
      if (item.type === 'StringLiteral') {
        return t.jSXText(item.value);
      }

      return t.jSXExpressionContainer(item);
    }

    return item;
  });

  return buildJSXElement(fragmentExpression, [], jSXChildren);
}
