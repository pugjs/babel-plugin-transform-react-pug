import assert from 'assert';
import error from 'pug-error';

// Mising "types"
//  - Comment
//  - BlockComment
//  - &attributes
//  - InterpolatedTag
//  - Code(buffer: false + block)
//  - Each(object)

function addLocToAst(ast, line) {
  if (ast.loc) {
    ast.loc = {
      start: {line: line + ast.loc.start.line - 1, column: 0},
      end: {line: line + ast.loc.end.line - 1, column: 0},
    };
    Object.keys(ast).forEach(key => {
      if (Array.isArray(ast[key])) {
        ast[key].forEach(n => addLocToAst(n, line));
      } else if (ast[key] && typeof ast[key] === 'object') {
        addLocToAst(ast[key], line);
      }
    });
  }
}
export default function ({babel, parse, helpers, ast, path, code}) {
  const {types} = babel;
  const baseLine = path.node.loc.start.line;
  let lastLine = 0;
  const t = {};
  function getFn(key) {
    return (...args) => {
      const res = types[key](...args);
      const loc = {line: baseLine + lastLine, column: 0};
      res.loc = {start: loc, end: loc};
      return res;
    };
  }
  for (const key in types) {
    if (/^is|^assert/.test(key)) {
      t[key] = types[key];
    } else {
      t[key] = getFn(key);
    }
  }
  const nodes = t.identifier('pug_nodes');
  function withString(node, stringLiteral) {
    t.assertStringLiteral(stringLiteral);
    if (t.isStringLiteral(node)) {
      return t.stringLiteral(node.value + stringLiteral.value);
    }
    if (t.isBinaryExpression(node, {operator: '+'}) && t.isStringLiteral(node.right)) {
      return t.binaryExpression('+', node.left, withString(node.right, stringLiteral));
    }
    return t.binaryExpression('+', node, stringLiteral);
  }
  let staticBlockID = 0;
  const compiler = {
    baseBlock() {
      return {
        _id: 'base',
        getKey(fn) {
          fn(t.stringLiteral('pug'));
        },
        handleAttributes(attrs) {},
        end() {},
      };
    },
    staticBlock(parent) {
      let enabled = false;
      let parentEnabled = false;
      let key = null;
      const pending = [];
      let index = 0;
      parent.getKey(parentKey => {
        parentEnabled = true;
        key = withString(parentKey, t.stringLiteral(':' + (staticBlockID++)));
        onUpdate();
      });
      function onUpdate() {
        if (enabled && parentEnabled) {
          while (pending.length) {
            pending.shift()(withString(key, t.stringLiteral(':' + (index++))));
          }
        }
      }
      return {
        getKey(fn) {
          if (pending.indexOf(fn) === -1) {
            pending.push(fn);
          }
          onUpdate();
        },
        handleAttributes(attrs) {
          for (const attr of attrs) {
            if (
              t.isJSXAttribute(attr) &&
              t.isJSXIdentifier(attr.name, {name: 'key'})
            ) {
              return;
            }
          }
          this.getKey(key => {
            if (t.isStringLiteral(key)) key = key; // t.jSXText(key.value);
            else key = t.jSXExpressionContainer(key);
            attrs.push(t.jSXAttribute(
              t.jSXIdentifier('key'),
              key,
            ));
          });
        },
        end() {
          enabled = true;
          onUpdate();
        },
      };
    },
    dynamicBlock(parent, lineNumber) {
      let enabled = false;
      let localKey = null;
      let parentEnabled = false;
      let parentKey = null;
      const pending = [];
      let index = 0;
      function join(left, right) {
        return t.binaryExpression('+', left, right);
      }
      parent.getKey(_parentKey => {
        parentEnabled = true;
        parentKey = withString(_parentKey, t.stringLiteral(':'));
        onUpdate();
      });
      function onUpdate() {
        if (enabled && parentEnabled && localKey) {
          while (pending.length) {
            pending.shift()(withString(join(parentKey, localKey), t.stringLiteral(':' + (index++))));
          }
        } else if (enabled && parentEnabled) {
          const err = error('MISSING_KEY', 'You must specify a key for the first item in any loops.', {
            line: path.node.loc.start.line + lineNumber,
            filename: 'pug',
            src: code,
          });
          throw err;
        }
      }
      return {
        getKey(fn) {
          if (pending.indexOf(fn) === -1) {
            pending.push(fn);
          }
          onUpdate();
        },
        handleAttributes(attrs) {
          for (const attr of attrs) {
            if (
              t.isJSXAttribute(attr) &&
              t.isJSXIdentifier(attr.name, {name: 'key'})
            ) {
              if (localKey === null && t.isJSXExpressionContainer(attr.value) && attr.value.expression) {
                localKey = attr.value.expression;
                onUpdate();
                // remove the attribute and replace with the properly nested version
                attrs.splice(attrs.indexOf(attr), 1);
              } else {
                return;
              }
            }
          }
          this.getKey(key => {
            if (t.isStringLiteral(key)) key = key; // t.jSXText(key.value);
            else key = t.jSXExpressionContainer(key);
            attrs.push(t.jSXAttribute(
              t.jSXIdentifier('key'),
              key,
            ));
          });
        },
        end() {
          enabled = true;
          onUpdate();
        },
      };
    },

    parseExpression(src) {
      const val = parse('x = (' + src + ');').program.body;
      assert(val.length === 1);
      // TODO: add the correct column number
      addLocToAst(val[0], baseLine + lastLine);
      return val[0].expression.right;
    },
    parseStatement(src) {
      const val = parse(src).program.body;
      assert(val.length === 1);
      // TODO: add the correct column number
      addLocToAst(val[0], baseLine + lastLine);
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

    wrapStatementsInExpression(statements, withNodes) {
      if (!withNodes) {
        return t.callExpression(
          t.arrowFunctionExpression([], t.blockStatement(statements)),
          []
        );
      }
      return t.callExpression(
        t.arrowFunctionExpression(
          [nodes],
          t.blockStatement(
            [...statements, t.returnStatement(nodes)],
          ),
        ),
        [t.arrayExpression([])]
      );
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

    visit(node, mode, block) {
      if (typeof this['visit' + node.type] === 'function') {
        if (node.line) {
          lastLine = node.line - 1;
        }
        return this['visit' + node.type](node, mode, block);
      } else {
        throw new Error(node.type + ' is not yet supported');
      }
    },

    // [ "JSXExpressionContainer", "ConditionalExpression", "IfStatement" ]
    visitCase(node, mode, block) {
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
      return this.visit(base.alternate, mode, block);
    },

    // [ "JSX", "Expression", "Statement" ]
    visitCode(node, mode, block) {
      if (node.buffer && !node.mustEscape) {
        throw new Error('Unescaped, buffered code is not supported in react-pug');
      }
      switch (mode) {
        case 'jsx':
          return this.wrapExpressionInJSX(this.visitCode(node, 'jsExpression', block));
        case 'jsExpression':
          if (node.buffer) {
            return this.parseExpression(node.val);
          }
          // TODO: hoist and rename `const` and `let` variables
          return this.wrapStatementsInExpression(this.parseStatement(node.val), false);
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
    visitConditional(node, mode, block) {
      if (node.alternate && node.alternate.type === 'Conditional') {
        node.alternate = {nodes: [node.alternate]};
      }
      const test = this.parseExpression(node.test);
      switch (mode) {
        case 'jsx':
          return t.jSXExpressionContainer(this.visitConditional(node, 'jsExpression', block));
        case 'jsExpression':
          const condConsequentBlock = this.staticBlock(block);
          const condConsequent = this.joinJsExpressions(
            node.consequent.nodes.map(
              node => this.visit(node, 'jsExpression', condConsequentBlock),
            ).filter(Boolean),
          );
          condConsequentBlock.end();
          let condAlternate = t.nullLiteral();
          if (node.alternate) {
            const alternateBlock = this.staticBlock(block);
            condAlternate = this.joinJsExpressions(
              node.alternate.nodes.map(
                node => this.visit(node, 'jsExpression', alternateBlock),
              ).filter(Boolean),
            );
            alternateBlock.end();
          }
          return t.conditionalExpression(
            test,
            condConsequent,
            condAlternate,
          );
        case 'jsStatements':
          const ifConsequentBlock = this.staticBlock(block);
          const ifConsequent = t.blockStatement(
            this.joinJsStatements(
              node.consequent.nodes.map(
                node => this.visit(node, 'jsStatements', ifConsequentBlock),
              ),
            ),
          );
          ifConsequentBlock.end();
          let ifAlternate = null;
          if (node.alternate) {
            const alternateBlock = this.staticBlock(block);
            ifAlternate = t.blockStatement(
              this.joinJsStatements(
                node.alternate.nodes.map(
                  node => this.visit(node, 'jsStatements', alternateBlock),
                ),
              ),
            );
            alternateBlock.end();
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
    visitEach(node, mode, block) {
      if (mode === 'jsx') {
        return this.wrapExpressionInJSX(this.visitEach(node, 'jsExpression', block));
      }
      if (mode === 'jsExpression') {
        return this.wrapStatementsInExpression(this.visitEach(node, 'jsStatements', block), true);
      }
      const childBlock = this.dynamicBlock(block, node.line);
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
              node => this.visit(node, 'jsStatements', childBlock),
            ),
          ),
        ),
      ));
      childBlock.end();
      if (node.alternate) {
        const alternateBlock = this.staticBlock(block);
        const alternate = t.blockStatement(this.joinJsStatements(
          node.alternate.nodes.map(
            node => this.visit(node, 'jsStatements', alternateBlock),
          ).filter(Boolean),
        ));
        alternateBlock.end();
        loop = t.ifStatement(
          objLength,
          loop,
          alternate,
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
    visitTag(node, mode, block) {
      const name = t.jSXIdentifier(node.name);
      const children = (
        (
          node.code ?
          [this.visitCode(node.code, 'jsx', this.baseBlock())] :
          []
        ).concat(node.block.nodes.map(
          node => this.visit(node, 'jsx', this.baseBlock())
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
      block.handleAttributes(attrs);
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
    visitText(node, mode, block) {
      switch (mode) {
        case 'jsx':
          return t.jSXText(node.val);
        case 'jsExpression':
          return t.stringLiteral(node.val);
        case 'jsStatements':
          return [this.getPushStatement(this.visitText(node, 'jsExpression', block))];
        default:
          throw new Error('Unexpected mode "' + mode + '" should be "jsx", "jsStatement" or "jsExpression"');
      }
    },

    // [ "JSXExpressionContainer", "DoExpression", "WhileStatement" ]
    visitWhile(node, mode, block) {
      if (mode === 'jsx') {
        return this.wrapExpressionInJSX(this.visitWhile(node, 'jsExpression', block));
      }
      if (mode === 'jsExpression') {
        return this.wrapStatementsInExpression(this.visitWhile(node, 'jsStatements', block), true);
      }
      const childBlock = this.dynamicBlock(block, node.line);
      const test = this.parseExpression(node.test);
      const body = t.blockStatement(
        this.joinJsStatements(
          node.block.nodes.map(
            node => this.visit(node, 'jsStatements', childBlock),
          ).filter(Boolean),
        ),
      );
      childBlock.end();
      return [t.whileStatement(test, body)];
    },
  };
  return ast.nodes.map(node => compiler.visit(node, 'jsExpression', compiler.baseBlock()));
}
