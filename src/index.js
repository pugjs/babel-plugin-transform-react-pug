import {parse as babylonParse} from 'babylon';
import parsePug from './parse-pug';
import Context from './context';
import {visitExpression} from './visitors';
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
        if (
          isReactPugReference(path.node.tag) &&
          path.node.quasi.expressions.length === 0 &&
          path.node.quasi.quasis.length === 1
        ) {
          let src = path.node.quasi.quasis[0].value.raw;
          const minIndent = src.split('\n').reduce(
            (minIndent, line) => {
              return line.trim().length ? Math.min(/^ */.exec(line)[0].length, minIndent) : minIndent;
            },
            Infinity,
          );
          src = src.split('\n').map(
            line => line.substr(minIndent),
          ).join('\n');
          const ast = parsePug(src);

          const context = Context.create(this.file, path);
          const transformed = ast.nodes.map(node => visitExpression(node, context));
          const expression = transformed.length === 1 ? transformed[0] : t.arrayExpression(transformed);
          if (context.variablesToDeclare.length) {

          }
          context.variablesToDeclare.forEach(id => {
            path.scope.push({kind: 'let', id});
          })
          path.replaceWith(expression);
        }
      },
    },
  };
}
