/**
 * The interpolation reference is used to indicate
 * that an interpolation needs to occur when encountered
 * by a visitor.
 */
const INTERPOLATION_REFERENCE_ID = '_react_pug_replace_'

/**
 * Check whether the value is a valid interpolation
 * reference.
 * @param { string } value - The value to check
 * @returns { bool } Whether the value is an
 * interpolation reference.
 */
function isInterpolationRef(value: string): boolean {
  const ref = value.replace(/[0-9]/g, '');
  return INTERPOLATION_REFERENCE_ID === ref;      
}

/**
 * Convert pug raw template array into a string
 * containing references to interpolations as well
 * a map containing the interpolations.
 * @param { Array<BabelNode> } tpl - The template array
 * @param { Array<BabelNode> } interpolations - The interpolations
 * @returns { Object } - The template with interpolation references
 * and a map containing the reference and the interpolation.
 */
function getInterpolatedTemplate(tpl: Array<BabelNode>, interpolations: Array<BabelNode>): { template: string, interpolationRef: Map<string, Expression> } {
    
  const interpolationRef: Map<string, BabelNode> = new Map();

  let template = tpl.map((section, index) => {
    
    const interpolation = interpolations[index];

    let ref = interpolation != null ? `${INTERPOLATION_REFERENCE_ID}${index}` : '';

    if (ref.length) {
      interpolationRef.set(ref, interpolation);  
    }

    return `${section.value.raw}${ref}`;

  }).join(''); 

  return { template, interpolationRef };
    
}
                                                         
export { 
  INTERPOLATION_REFERENCE_ID,
  isInterpolationRef,    
  getInterpolatedTemplate    
}