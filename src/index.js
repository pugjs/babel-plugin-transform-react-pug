import {parse as babylonParse} from 'babylon';
import parsePug from './parse-pug';
import codeGen from './code-gen';

export default function (babel) {
  const {types: t} = babel;
  function isReactPugReference(node) {
    // TODO: do this better
    return t.isIdentifier(node, {name: 'pug'});
  }
  const helpers = {};
  return {
    visitor: {
      Program(path) {
        helpers.flatten = path.scope.generateUidIdentifier('pugFlatten');
        const flattenInnerHelper = path.scope.generateUidIdentifier('pugFlattenInnerHelper');
        const Array_isArray = (
          t.memberExpression(
            t.identifier('Array'),
            t.identifier('isArray')
          )
        );
        path.unshiftContainer("body", [
          t.functionDeclaration(
            flattenInnerHelper,
            [t.identifier('arr'), t.identifier('val')],
            t.blockStatement([
              t.returnStatement(
                t.callExpression(
                  t.memberExpression(
                    t.identifier('arr'),
                    t.identifier('concat'),
                  ),
                  [
                    t.conditionalExpression(
                      t.callExpression(Array_isArray, [t.identifier('val')]),
                      t.callExpression(helpers.flatten, [t.identifier('val')]),
                      t.identifier('val'),
                    ),
                  ],
                ),
              ),
            ]),
          ),
          t.functionDeclaration(
            helpers.flatten,
            [t.identifier('arr')],
            t.blockStatement([
              t.returnStatement(
                t.callExpression(
                  t.memberExpression(
                    t.identifier('arr'),
                    t.identifier('reduce'),
                  ),
                  [
                    flattenInnerHelper,
                    t.arrayExpression([]),
                  ],
                ),
              ),
            ]),
          ),
        ]);
      },
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
          const transformed = codeGen({
            babel,
            parse: (str) => babylonParse(str, this.file.parserOpts),
            helpers,
            ast,
            path,
            code: this.file.code,
          });

          if (transformed.length === 1) {
            path.replaceWith(transformed[0]);
          } else {
            path.replaceWith(t.arrayExpression(transformed));
          }
        }
      },
    },
  };
}
