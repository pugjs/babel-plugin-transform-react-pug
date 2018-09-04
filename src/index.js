import common from 'common-prefix';
import parsePug from './parse-pug';
import Context from './context';
import {visitExpression} from './visitors';
import {getInterpolatedTemplate} from './utils/interpolation';
import {buildJSXFragment} from './utils/jsx';
import {setBabelTypes} from './lib/babel-types';

export default function(babel) {
  const {types: t} = babel;

  setBabelTypes(t);

  function isReactPugReference(node) {
    // TODO: do this better
    return t.isIdentifier(node, {name: 'pug'});
  }

  return {
    visitor: {
      TaggedTemplateExpression(path) {
        const {node} = path;
        const {quasis, expressions} = node.quasi;

        if (isReactPugReference(node.tag) && quasis.length >= 1) {
          let template, interpolationRef;

          if (expressions.length) {
            const interpolatedTpl = getInterpolatedTemplate(
              quasis,
              expressions,
            );
            template = interpolatedTpl.template;
            interpolationRef = interpolatedTpl.interpolationRef;
          } else {
            template = quasis[0].value.raw;
          }

          let src = template.split('\n');

          const minIndent = common(
            src
              .filter(line => line.trim() !== '')
              .map(line => /^[ \t]*/.exec(line)[0]),
          );

          src = src.map(line => line.substr(minIndent.length)).join('\n');

          const ast = parsePug(src);
          const context = Context.create(this.file, path, interpolationRef);
          const transformed = ast.nodes.map(node =>
            visitExpression(node, context),
          );

          const expression =
            transformed.length === 1
              ? transformed[0]
              : buildJSXFragment(transformed);

          context.variablesToDeclare.forEach(id => {
            path.scope.push({kind: 'let', id});
          });

          path.replaceWith(expression);
        }
      },
    },
  };
}
