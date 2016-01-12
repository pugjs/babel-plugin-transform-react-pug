import assert from 'assert';
// Mising "types"
//  - Comment
//  - BlockComment
//  - &attributes
//  - InterpolatedTag
//  - Code(buffer: false + block)
//  - Each(object)
//  - Mixin
export default function ({babel, parse, helpers, ast, path}) {
  const {types: t} = babel;
  const compiler = {
    unwrap(node) {
      if (t.isJSXExpressionContainer(node)) {
        return node.expression;
      } else if (t.isJSXText(node)) {
        return t.stringLiteral(node.value);
      } else {
        return node;
      }
    },
    unwrapExpressionToStatements(node) {
      if (t.isDoExpression(node)) {
        return node.body.body;
      } else if (t.isJSXExpressionContainer(node)) {
        return this.unwrapExpressionToStatements(node.expression);
      } else {
        return [t.expressionStatement(this.unwrap(node))];
      }
    },
    parseExpression(src) {
      const val = parse('x = (' + src + ');').program.body;
      assert(val.length === 1);
      return val[0].expression.right;
    },
    parseStatement(src) {
      const val = parse(src).program.body;
      assert(val.length === 1);
      return val[0];
    },
    visit(node) {
      if (typeof this['visit' + node.type] === 'function') {
        return this['visit' + node.type](node);
      } else {
        throw new Error(node.type + ' is not yet supported');
      }
    },

    visitBlock(node) {
      return node.nodes.map(
        node => this.visit(node)
      ).filter(Boolean);
    },

    visitCase(node) {
      // compile the case/when into a series of conditionals then compile that down to jsx
      const base = {alternate: null};
      let parent = base;
      let defaultValue = {type: 'Block', nodes: []};
      node.block.nodes.forEach(whenNode => {
        if (whenNode.expr === 'default') {
          defaultValue = whenNode.block;
        } else {
          parent.alternate = {
            type: 'Conditional',
            test: node.expr + ' === ' + whenNode.expr,
            consequent: whenNode.block,
            alternate: null,
          };
          parent = parent.alternate;
        }
      });
      if (!base.alternate) {
        throw new Error('Empty case blocks are not supported');
      }
      parent.alternate = defaultValue;
      return this.visit(base.alternate);
    },

    visitCode(node) {
      if (node.buffer) {
        if (!node.mustEscape) {
          throw new Error('Unescaped, buffered code is not supported in react-pug');
        }
        return t.jSXExpressionContainer(
          this.parseExpression(node.val)
        );
      } else {
        // TODO: hoist and rename `const` and `let` variables
        return t.jSXExpressionContainer(
          t.doExpression(
            t.blockStatement([
              this.parseStatement(node.val),
              t.expressionStatement(t.nullLiteral()),
            ]),
          ),
        );
      }
    },

    simplifyBlock(nodes) {
      const id = path.scope.generateUidIdentifier('SimpleBlock').name;
      nodes = nodes.map(this.unwrap);
      if (nodes.length === 1) {
        return nodes[0];
      }
      nodes.forEach((node, i) => {
        if (
          t.isJSXElement(node) &&
          !node.openingElement.attributes.some(
            attr => (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, {name: 'key'}))
          )
        ) {
          const attr = t.jSXAttribute(
            t.jSXIdentifier('key'),
            t.stringLiteral(id + '_' + i),
          );
          attr.pugSimpleBlockAttr = true;
          node.openingElement.attributes.push(attr);
        }
      });
      return t.arrayExpression(nodes);
    },

    visitConditional(node) {
      const test = this.parseExpression(node.test);
      const consequent = this.simplifyBlock(this.visitBlock(node.consequent));
      const alternate = (
        !node.alternate
        ? t.nullLiteral()
        : node.alternate.type === 'Block'
        ? this.simplifyBlock(this.visitBlock(node.alternate))
        : this.unwrap(this.visitConditional(node.alternate))
      );
      return t.jSXExpressionContainer(
        t.conditionalExpression(
          test,
          consequent,
          alternate,
        )
      );
    },

    simplifyDynamicBlock(block /* Array<Expression> */, nodesIdentifier) {
      if (!nodesIdentifier) {
        throw new Error('Simplify Dynamic Block requires an identifier');
      }
      const body = [];
      let key = null;
      block.map(exp => this.unwrapExpressionToStatements(exp)).forEach((statements, i) => {
        const last = statements.pop();
        statements.forEach(s => body.push(s));
        t.assertExpressionStatement(last);
        if (!t.isNullLiteral(last.expression)) {
          if (t.isJSXElement(last.expression)) {
            last.expression.openingElement.attributes = last.expression.openingElement.attributes.filter(
              attr => {
                return !attr.pugSimpleBlockAttr;
              },
            );
            const hasKey = last.expression.openingElement.attributes.some(
              attr => {
                if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, {name: 'key'})) {
                  if (t.isJSXExpressionContainer(attr.value) && key === null) {
                    key = attr.value.expression;
                  }
                  return true;
                }
                return false;
              }
            );
            if (!hasKey && key) {
              last.expression.openingElement.attributes.push(
                t.jSXAttribute(
                  t.jSXIdentifier('key'),
                  t.jSXExpressionContainer(
                    t.binaryExpression(
                      '+',
                      key,
                      t.stringLiteral('_' + i),
                    ),
                  ),
                ),
              );
            }
          }
          body.push(
            t.expressionStatement(
              t.callExpression(
                t.memberExpression(
                  nodesIdentifier,
                  t.identifier('push'),
                ),
                [last.expression],
              ),
            ),
          );
        }
      });
      return body;
    },

    visitEach(node) {
      const nodes = path.scope.generateUidIdentifier('EachBlock');
      const arr = this.parseExpression(node.obj);
      const params = [this.parseExpression(node.val)];
      if (node.key) params.push(this.parseExpression(node.key));
      const block = this.visitBlock(node.block);
      const body = (
        block.length === 1
        ? [t.returnStatement(this.unwrap(block[0]))]
        : [t.variableDeclaration(
          'var',
          [
            t.variableDeclarator(
              nodes,
              t.arrayExpression([]),
            ),
          ],
        )].concat(this.simplifyDynamicBlock(block, nodes)).concat([t.returnStatement(nodes)])
      );

      const mapCall = t.callExpression(
        t.memberExpression(arr, t.identifier('map')),
        [
          t.functionExpression(
            null,
            params,
            t.blockStatement(body),
          ),
          t.thisExpression(),
        ],
      );
      const condition = t.logicalExpression('&&', arr, t.memberExpression(arr, t.identifier('length')));
      const flatBody = body.length === 1 ? mapCall : t.callExpression(helpers.flatten, [mapCall]);
      const alternate = node.alternate ? this.simplifyBlock(this.visitBlock(node.alternate)) : t.nullLiteral();
      const loop = t.jSXExpressionContainer(
        t.conditionalExpression(
          condition,
          flatBody,
          alternate,
        ),
      );
      return loop;
    },

    visitTag(node) {
      const name = t.jSXIdentifier(node.name);
      const children = (
        (
          node.code ?
          [this.visitCode(node.code)] :
          []
        ).concat(this.visitBlock(node.block))
      ).reduce((a, b) => a.concat(Array.isArray(b) ? b : [b]), []);

      if (node.attributeBlocks.length) {
        throw new Error('Attribute blocks are not yet supported in react-pug');
      }

      const classes = [];
      const attrs = node.attrs.map(
        ({name, val, mustEscape}) => {
          if (/\.\.\./.test(name) && val === true) {
            return t.jSXSpreadAttribute(this.parseExpression(name.substr(3)));
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
          const expr = this.parseExpression(val === true ? 'true' : val);
          if (!mustEscape && (!t.isStringLiteral(expr) || /(\<\>\&)/.test(val))) {
            throw new Error('Unescaped attributes are not supported in react-pug');
          }
          if (name === 'className') {
            classes.push(expr);
            return null;
          }
          const jsxValue = (
            t.isStringLiteral(expr) || t.isJSXElement(expr)
            ? expr
            : t.jSXExpressionContainer(expr)
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
          ? t.stringLiteral(classes.map(cls => cls.value).join(' '))
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
      const open = t.jSXOpeningElement(
        name,
        attrs, // Array<JSXAttribute | JSXSpreadAttribute>
        children.length === 0,
      );
      const close = (
        children.length === 0
        ? null
        : t.jSXClosingElement(name)
      );
      return t.jSXElement(
        open,
        close,
        children, // ["StringLiteral","JSXExpressionContainer","JSXElement"]
        children.length === 0
      );
    },

    visitText(node) {
      return t.jSXText(node.val);
    },

    visitWhile(node) {
      const nodes = path.scope.generateUidIdentifier('WhileBlock');
      const statements = [];
      statements.push(
        t.variableDeclaration(
          'var',
          [
            t.variableDeclarator(
              nodes,
              t.arrayExpression([]),
            ),
          ],
        ),
      );
      const test = this.parseExpression(node.test);
      const body = this.simplifyDynamicBlock(this.visitBlock(node.block), nodes);
      statements.push(t.whileStatement(
        test,
        t.blockStatement(body),
      ));
      statements.push(t.expressionStatement(nodes));
      return t.jSXExpressionContainer(
        t.doExpression(
          t.blockStatement(statements)
        ),
      );
    },
  };
  return compiler.visit(ast);
}
