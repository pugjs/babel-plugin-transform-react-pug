// @flow

/**
 * The interpolation reference is used to indicate
 * that an interpolation needs to occur when encountered
 * by a visitor.
 */
const INTERPOLATION_REFERENCE_ID = '_react_pug_replace_';

/**
 * Used to check whether a value contains a replace
 * reference or multiple replace references.
 */
const INTERPOLATION_REFERENCE_REGEX = /_react_pug_replace_\d+/g;

/**
 * Check whether the value is a valid interpolation
 * reference.
 * @param { string } value - The value to check
 * @returns { ?Array<string> } The references within
 * the value or null.
 */
function getInterpolationRefs(value: string): ?Array<string> {
  return value.match(INTERPOLATION_REFERENCE_REGEX);
}

/**
 * Convert pug raw template array into a string
 * containing references to interpolations as well
 * a map containing the interpolations.
 * @param { Array<TemplateElement> } tpl - The template array
 * @param { Array<Expression> } interpolations - The interpolations
 * @returns { Object } - The template with interpolation references
 * and a map containing the reference and the interpolation.
 */
function getInterpolatedTemplate(tpl: Array<TemplateElement>, interpolations: Array<Expression>): { template: string, interpolationRef: Map<string, Expression> } {
  const interpolationRef: Map<string, Expression> = new Map();

  const template = tpl.map(({ value }, index) => {

    const interpolation = interpolations[index];
    const rawValue = value && typeof value === 'object' ? value.raw : '';

    if (interpolation) {
      const ref = `${INTERPOLATION_REFERENCE_ID}${index}`;
      interpolationRef.set(ref, interpolation);
      return `${String(rawValue)}${ref}`;
    }

    return rawValue;

  }).join('');

  return {template, interpolationRef};
}

export {
  INTERPOLATION_REFERENCE_ID,
  INTERPOLATION_REFERENCE_REGEX,
  getInterpolationRefs,
  getInterpolatedTemplate,
};
