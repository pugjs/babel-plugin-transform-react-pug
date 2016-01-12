import assert from 'assert';

// Mising "types"
//  - Comment
//  - BlockComment
//  - &attributes
//  - InterpolatedTag
//  - Code(buffer: false + block)
//  - Each(object)

export default function ({babel, parse, helpers, ast, path}) {
  const {types: t} = babel;
  const nodes = t.identifier('pug_nodes');
  let staticBlockID = 0;
  const compiler = {
    staticBlock() {
      let enabled = false;
      const id = 'pugblock' + (staticBlockID++);
      const pending = [];
      let index = 0;
      function getAttribute() {
        return t.jSXAttribute(
          t.jSXIdentifier('key'),
          t.stringLiteral(id + '_' + (index++)),
        );
      }
      function addKey(attrs) {
        if (enabled) {
          attrs.push(getAttribute());
        } else {
          pending.push(attrs);
        }
      }
      return {
        handleAttributes(attrs) {
          for (const attr of attrs) {
            if (
              t.isJSXAttribute(attr) &&
              t.isJSXIdentifier(attr.name, {name: 'key'})
            ) {
              return;
            }
          }
          addKey(attrs);
        },
        enable() {
          if (!enabled) {
            enabled = true;
            pending.forEach(addKey);
          }
        },
      };
    },
    dynamicBlock() {
      const pending = [];
      let keyValue = null;
      let index = 0;
      function getAttribute() {
        t.jSXAttribute(
          t.jSXIdentifier('key'),
          t.jSXExpressionContainer(
            t.binaryExpression(
              '+',
              keyValue,
              t.stringLiteral('_' + (index++)),
            ),
          ),
        );
      }
      function addKey(attrs) {
        if (keyValue) {
          attrs.push(getAttribute());
        } else {
          pending.push(attrs);
        }
      }
      return {
        handleAttributes(attrs) {
          for (const attr of attrs) {
            if (
              t.isJSXAttribute(attr) &&
              t.isJSXIdentifier(attr.name, {name: 'key'})
            ) {
              if (keyValue === null && t.isJSXExpressionContainer(attr.value) && attr.value.expression) {
                keyValue = attr.value.expression;
                pending.forEach(addKey);
              }
              return;
            }
          }
          addKey(attrs);
        },
      };
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

    wrapExpressionInJSX(value) { // returns ["JSX"]
      if (t.isJSX(value)) {
        return value;
      } else if (t.isStringLiteral(value)) {
        return t.jSXText(value.value);
      } else {
        return t.jSXExpressionContainer(value);
      }
    },

    joinJsExpressions(values) {
      const vals = [];
      // flatten one level
      for (const val of values) {
        if (t.isArrayExpression(val)) {
          for (const e of val.entries) {
            vals.push(e);
          }
        } else {
          vals.push(val);
        }
      }
      if (vals.length === 0) {
        return t.nullLiteral();
      } else if (vals.length === 1) {
        return vals[0];
      } else {
        return t.arrayExpression(vals);
      }
    },

    joinJsStatements(values) {
      const vals = [];
      // flatten one level
      for (const val of values) {
        if (Array.isArray(val)) {
          for (const e of val) {
            vals.push(e);
          }
        } else {
          vals.push(val);
        }
      }
      return vals;
    },

    getPushStatement(arg) {
      return t.expressionStatement(
        t.callExpression(
          t.memberExpression(
            nodes,
            t.identifier('push'),
          ),
          [arg],
        ),
      );
    },

    visit(node, mode) {
      if (typeof this['visit' + node.type] === 'function') {
        return this['visit' + node.type](node, mode);
      } else {
        throw new Error(node.type + ' is not yet supported');
      }
    },

    // [ "JSXExpressionContainer", "ConditionalExpression", "IfStatement" ]
    visitCase(node, mode) {
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
      return this.visit(base.alternate, mode);
    },

    // [ "JSX", "Expression", "Statement" ]
    visitCode(node, mode) {
      if (node.buffer && !node.mustEscape) {
        throw new Error('Unescaped, buffered code is not supported in react-pug');
      }
      switch (mode) {
        case 'jsx':
          return this.wrapExpressionInJSX(this.visitCode(node, 'jsExpression'));
        case 'jsExpression':
          if (node.buffer) {
            return this.parseExpression(node.val);
          }
          // TODO: hoist and rename `const` and `let` variables
          return t.doExpression(
            t.blockStatement([
              this.parseStatement(node.val),
              t.expressionStatement(t.nullLiteral()),
            ]),
          );
        case 'jsStatements':
          if (node.buffer) {
            return [this.getPushStatement(this.parseExpression(node.val))];
          }
          return [this.parseStatement(node.val)];
        default:
          throw new Error('Unexpected mode "' + mode + '" should be "jsx", "jsStatement" or "jsExpression"');
      }
    },

    // [ "JSXExpressionContainer", "ConditionalExpression", "IfStatement" ]
    visitConditional(node, mode) {
      if (node.alternate && node.alternate.type === 'Conditional') {
        node.alternate = {nodes: [node.alternate]};
      }
      const test = this.parseExpression(node.test);
      switch (mode) {
        case 'jsx':
          return t.jSXExpressionContainer(this.visitConditional(node, 'jsExpression'));
        case 'jsExpression':
          const condConsequent = this.joinJsExpressions(
            node.consequent.nodes.map(
              node => this.visit(node, 'jsExpression'),
            ).filter(Boolean),
          );
          let condAlternate = t.nullLiteral();
          if (node.alternate) {
            condAlternate = this.joinJsExpressions(
              node.alternate.nodes.map(
                node => this.visit(node, 'jsExpression'),
              ).filter(Boolean),
            );
          }
          return t.conditionalExpression(
            test,
            condConsequent,
            condAlternate,
          );
        case 'jsStatements':
          const ifConsequent = t.blockStatement(
            this.joinJsStatements(
              node.consequent.nodes.map(
                node => this.visit(node, 'jsStatements'),
              ),
            ),
          );
          let ifAlternate = null;
          if (node.alternate) {
            ifAlternate = t.blockStatement(
              this.joinJsStatements(
                node.alternate.nodes.map(
                  node => this.visit(node, 'jsStatements'),
                ),
              ),
            );
          }
          return [
            t.ifStatement(
              test,
              ifConsequent,
              ifAlternate,
            ),
          ];
        default:
          throw new Error('Unexpected mode "' + mode + '" should be "jsx", "jsStatement" or "jsExpression"');
      }
    },

    // [ "JSXExpressionContainer", "DoExpression", "WhileStatement" ]
    visitEach(node, mode) {
      if (mode === 'jsx') {
        return this.wrapExpressionInJSX(this.visitEach(node, 'jsExpression'));
      }
      if (mode === 'jsExpression') {
        const variableDeclaration = t.variableDeclaration(
          'const',
          [
            t.variableDeclarator(
              nodes,
              t.arrayExpression([]),
            ),
          ],
        );
        const end = t.expressionStatement(nodes);
        return t.doExpression(
          t.blockStatement([variableDeclaration, ...(this.visitEach(node, 'jsStatements')), end]),
        );
      }
      const obj = path.scope.generateUidIdentifier('pug_arr');
      const objLength = t.memberExpression(
        obj,
        t.identifier('length'),
      );
      const variableDeclaration = t.variableDeclaration(
        'const',
        [
          t.variableDeclarator(
            obj,
            this.parseExpression(node.obj),
          ),
        ],
      );
      const index = node.key ? t.identifier(node.key) : path.scope.generateUidIdentifier('pug_index');
      const init = t.variableDeclaration(
        'let',
        [
          t.variableDeclarator(
            index,
            t.numericLiteral(0),
          ),
        ],
      );
      const test = t.binaryExpression(
        '<',
        index,
        objLength,
      );
      const update = t.updateExpression(
        '++',
        index
      );
      let loop = t.forStatement(init, test, update, t.blockStatement(
        [
          t.variableDeclaration(
            'const',
            [
              t.variableDeclarator(
                t.identifier(node.val),
                t.memberExpression(
                  obj,
                  index,
                  true,
                ),
              ),
            ],
          ),
        ].concat(
          this.joinJsStatements(
            node.block.nodes.map(
              node => this.visit(node, 'jsStatements'),
            ),
          ),
        ),
      ));
      if (node.alternate) {
        loop = t.ifStatement(
          objLength,
          loop,
          t.blockStatement(this.joinJsStatements(
            node.alternate.nodes.map(
              node => this.visit(node, 'jsStatements'),
            ).filter(Boolean),
          )),
        );
      }
      return [
        variableDeclaration,
        t.ifStatement(
          t.callExpression(
            t.memberExpression(
              t.identifier('Array'),
              t.identifier('isArray'),
            ),
            [obj],
          ),
          t.blockStatement([loop]),
          t.blockStatement([
            t.throwStatement(
              t.newExpression(
                t.identifier('TypeError'),
                [t.stringLiteral('Expected ' + node.obj + ' to be an array.')],
              ),
            ),
          ]),
        ),
      ];
    },

    // returns ["JSXElement", "JSXElement", "PushStatement"] ]
    visitTag(node, mode) {
      const name = t.jSXIdentifier(node.name);
      const children = (
        (
          node.code ?
          [this.visitCode(node.code, 'jsx')] :
          []
        ).concat(node.block.nodes.map(
          // TODO: wrap visit results?
          node => this.visit(node, 'jsx')
        ).filter(Boolean))
        // TODO: assert that these are all valid jsx things
      );

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
      const element = t.jSXElement(
        open,
        close,
        children, // ["StringLiteral","JSXExpressionContainer","JSXElement"]
        children.length === 0
      );
      switch (mode) {
        case 'jsx':
        case 'jsExpression':
          return element;
        case 'jsStatements':
          return [this.getPushStatement(element)];
        default:
          throw new Error('Unexpected mode "' + mode + '" should be "jsx", "jsStatement" or "jsExpression"');
      }
    },

    // [ "JSXText", "StringLiteral", "PushStatement"]
    visitText(node, mode) {
      switch (mode) {
        case 'jsx':
          return t.jSXText(node.val);
        case 'jsExpression':
          return t.stringLiteral(node.val);
        case 'jsStatements':
          return [this.getPushStatement(this.visitText(node, 'jsExpression'))];
        default:
          throw new Error('Unexpected mode "' + mode + '" should be "jsx", "jsStatement" or "jsExpression"');
      }
    },

    // [ "JSXExpressionContainer", "DoExpression", "WhileStatement" ]
    visitWhile(node, mode) {
      if (mode === 'jsx') {
        return this.wrapExpressionInJSX(this.visitWhile(node, 'jsExpression'));
      }
      if (mode === 'jsExpression') {
        const variableDeclaration = t.variableDeclaration(
          'const',
          [
            t.variableDeclarator(
              nodes,
              t.arrayExpression([]),
            ),
          ],
        );
        const end = t.expressionStatement(nodes);
        return t.doExpression(
          t.blockStatement([variableDeclaration, ...(this.visitWhile(node, 'jsStatements')), end]),
        );
      }
      const test = this.parseExpression(node.test);
      // TODO: dynamicBlock
      const body = t.blockStatement(
        this.joinJsStatements(
          node.block.nodes.map(
            node => this.visit(node, 'jsStatements'),
          ).filter(Boolean),
        ),
      );
      return [t.whileStatement(test, body)];
    },
  };
  return ast.nodes.map(node => compiler.visit(node, 'jsExpression'));
}
