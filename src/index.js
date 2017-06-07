import {parse as babylonParse} from 'babylon';
import parsePug from './parse-pug';
import Context from './context';
import {visitExpression} from './visitors';
import {getInterpolatedTemplate} from './utils/interpolation';
import {setBabelTypes} from './babel-types';

export default function (babel) {
  const {types: t} = babel;
    
  setBabelTypes(t);
    
  function isReactPugReference(node) {
    // TODO: do this better
    return t.isIdentifier(node, {name: 'pug'});
  }
  
  return {
    visitor: {
      TaggedTemplateExpression(path) {
        
        let {node} = path;
        let {quasis, expressions} = node.quasi;
          
        if (isReactPugReference(node.tag) && quasis.length >= 1) {
          
          let {template, interpolationRef} = getInterpolatedTemplate(quasis, expressions);    
          let src = template.split('\n');
            
          const minIndent = src.reduce(
            (minIndent, line) => {
              return line.trim().length ? Math.min(/^ */.exec(line)[0].length, minIndent) : minIndent;
            },
            Infinity
          );
        
          src = src.map(line => line.substr(minIndent)).join('\n');
            
          const ast = parsePug(src);
          const context = Context.create(this.file, path, interpolationRef);
          const transformed = ast.nodes.map(node => visitExpression(node, context));
          const expression = transformed.length === 1 ? transformed[0] : t.arrayExpression(transformed);
            
          context.variablesToDeclare.forEach(id => {
            path.scope.push({kind: 'let', id});
          });
            
          path.replaceWith(expression);
            
        }
      },
    },
  };
}
