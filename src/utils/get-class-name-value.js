// @flow

import t from '../lib/babel-types';

function isParsableLiteral(expr: Expression): boolean {
  return (
    t.isStringLiteral(expr) ||
    t.isNumericLiteral(expr) ||
    t.isBooleanLiteral(expr) ||
    t.isNullLiteral(expr)
  );
}

function flattenAndFilterAttributeExpressions(
  classes: Array<Expression | ArrayExpression>,
): Array<Expression> {
  return [].concat(
    ...classes.map(item => {
      if (t.isArrayExpression(item)) {
        /*:: item = ((item: any): ArrayExpression) */
        return (item.elements: any).filter(
          item => item && !t.isSpreadElement(item),
        );
      } else {
        return item;
      }
    }),
  );
}

function combineParsableLiteralsAndExpressions(
  classes: Array<Expression>,
): Array<Array<Literal> | Array<Expression>> {
  const literalOfClasses = classes.map(item => isParsableLiteral(item));

  const result = [];
  const len = classes.length;

  let i = 0;
  let lookLiteral = true;

  while (i < len) {
    const nextDifferentIndex = literalOfClasses.indexOf(!lookLiteral, i);
    const start = i;
    const end = nextDifferentIndex < 0 ? len : nextDifferentIndex;

    result.push(classes.slice(start, end));

    lookLiteral = !lookLiteral;
    i = end;
  }

  return result;
}

function getValueOfLiterals(literals: Array<Literal>): string {
  if (literals.length < 1) {
    return '';
  }

  return literals
    .map(item => (item: any).value)
    .filter(Boolean)
    .join(' ');
}

function getMergedJSXExpression(
  classes: Array<Expression>,
): StringLiteral | JSXExpressionContainer {
  const combined = combineParsableLiteralsAndExpressions(classes);

  if (combined.length === 1) {
    const value = getValueOfLiterals((combined[0]: any));
    return t.stringLiteral(value);
  }

  if (combined.length === 2) {
    if (combined[0].length === 0 && combined[1].length === 1) {
      return t.jSXExpressionContainer(combined[1][0]);
    }
  }

  // Keep combined items in odd
  if (combined.length % 2 === 0) {
    combined.push(([]: Array<Literal>));
  }

  const quasis = [];
  const expressions = [];
  const len = combined.length;

  for (let i = 0; i < len; ++i) {
    let items = combined[i];
    const itemsLen = items.length;
    const isQuasi = i % 2 === 0;
    const isFirst = i === 0;
    const isLast = len - i <= 1;

    if (isQuasi) {
      /*:: items = ((items: any): Array<Literal>) */
      const value = getValueOfLiterals(items);
      const raw = value
        ? (isFirst ? '' : ' ') + value + (isLast ? '' : ' ')
        : '';
      const cooked = raw;

      quasis.push(t.templateElement({raw, cooked}, isLast));
    } else {
      expressions.push(items[0]);

      if (itemsLen > 1) {
        for (let j = 1; j < itemsLen; ++j) {
          const raw = ' ';
          const cooked = ' ';
          quasis.push(t.templateElement({raw, cooked}, false));
          expressions.push(items[j]);
        }
      }
    }
  }

  return t.jSXExpressionContainer(t.templateLiteral(quasis, expressions));
}

function getClassNameValue(
  classesViaShorthand: Array<StringLiteral>,
  classesViaAttribute: Array<ArrayExpression & StringLiteral>,
): any {
  const attrs = flattenAndFilterAttributeExpressions([
    ...classesViaShorthand,
    ...classesViaAttribute,
  ]);

  return getMergedJSXExpression(attrs);
}

export default getClassNameValue;
