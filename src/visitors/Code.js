// @flow

import type {VariableKind} from '../context';
import parseExpression from '../utils/parse-expression';
import parseStatement from '../utils/parse-statement';
import type Context from '../context';
import t from '../lib/babel-types';

function visitBufferedCode(node: Object, context: Context): Expression {
  return parseExpression(node.val, context);
}

function declareProperty(
  kind: VariableKind,
  prop: any,
  context: Context,
): RestProperty | Property {
  switch (prop.type) {
    case 'RestProperty':
      return {...prop, argument: declareLVal(kind, prop.argument, context)};
    case 'ObjectProperty':
      return {
        ...prop,
        value: prop.value && declareLVal(kind, prop.value, context),
      };
    default:
      throw new Error('Unexpected Property Type, ' + prop.type);
  }
}
function declareLVal(kind: VariableKind, val: any, context: Context): LVal {
  switch (val.type) {
    case 'ArrayPattern':
      return {
        ...val,
        elements: val.elements.map(el => declareLVal(kind, el, context)),
      };
    case 'Identifier':
      return context.declareVariable(kind, val.name).id;
    case 'ObjectPattern':
      return {
        ...val,
        properties: val.properties.map(p => declareProperty(kind, p, context)),
      };
    case 'RestElement':
      return {...val, argument: declareLVal(kind, val.argument, context)};
    default:
      throw new Error('Unexpected Left Value Type, ' + val.type);
  }
}
function visitUnbufferedCode(node: Object, context: Context) {
  // TODO: hoist and rename `const` and `let` variables
  const statement = parseStatement(node.val, context);
  const variableDeclaration = t.asVariableDeclaration(statement);
  if (variableDeclaration) {
    const kind = variableDeclaration.kind;
    const expressions = [];
    for (const declaration of variableDeclaration.declarations) {
      const lval = declareLVal(kind, declaration.id, context);
      expressions.push(
        t.assignmentExpression(
          '=',
          lval,
          declaration.init || t.identifier('undefined'),
        ),
      );
    }
    expressions.push(t.identifier('null'));
    return t.sequenceExpression(expressions);
  }
  if (t.isExpressionStatement(statement)) {
    return t.sequenceExpression([statement.expression, t.identifier('null')]);
  }
  return t.callExpression(
    t.arrowFunctionExpression([], t.blockStatement([statement])),
    [],
  );
}

const CodeVisitor = {
  expression(node: Object, context: Context) {
    if (node.buffer && !node.mustEscape) {
      throw new Error('Unescaped, buffered code is not supported in react-pug');
    }
    if (node.buffer) {
      return visitBufferedCode(node, context);
    } else {
      return visitUnbufferedCode(node, context);
    }
  },
};

export default CodeVisitor;
