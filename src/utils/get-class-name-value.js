// @flow

import t from '../lib/babel-types';

function getPlainShorthandValue(classes: Array<StringLiteral>): string | null {
  if (classes.length) {
    return classes
      .map(item => item.value)
      .filter(Boolean)
      .join(' ');
  }

  return null;
}

function getPlainClassNameValue(
  classes: Array<ArrayExpression & CallExpression & StringLiteral>,
): string | ArrayExpression | CallExpression | null | Array<any> {
  if (classes.every(item => t.isStringLiteral(item))) {
    return classes
      .map(item => item.value)
      .filter(Boolean)
      .join(' ');
  }

  if (classes.every(item => t.isArrayExpression(item))) {
    return classes.reduce((all, item) => all.concat(item.elements), []);
  }

  if (Array.isArray(classes)) {
    return classes[0];
  }

  return null;
}

function mergeStringWithClassName(
  shorthand: string | null,
  attribute: string | ArrayExpression | CallExpression | null | Array<any>,
) {
  // There are several branches:
  // - when attribute exists
  // - when shorthand only exists
  // - otherwise

  if (attribute) {
    if (typeof attribute === 'string') {
      if (shorthand) {
        return t.stringLiteral(shorthand + ' ' + attribute);
      }
      return t.stringLiteral(attribute);
    }

    if (Array.isArray(attribute)) {
      if (shorthand) {
        return t.jSXExpressionContainer(
          t.arrayExpression([t.stringLiteral(shorthand)].concat(attribute)),
        );
      }
      return t.jSXExpressionContainer(t.arrayExpression(attribute));
    }

    if (shorthand) {
      return t.jSXExpressionContainer(
        t.binaryExpression('+', t.stringLiteral(shorthand + ' '), attribute),
      );
    }

    return t.jSXExpressionContainer(attribute);
  }

  if (shorthand) {
    return t.stringLiteral(shorthand);
  }

  return null;
}

function getClassNameValue(
  classesViaShorthand: Array<StringLiteral>,
  classesViaAttribute: Array<ArrayExpression & CallExpression & StringLiteral>,
): any {
  const shorthandValue = getPlainShorthandValue(classesViaShorthand);
  const attributeValue = getPlainClassNameValue(classesViaAttribute);

  return mergeStringWithClassName(shorthandValue, attributeValue);
}

export default getClassNameValue;
