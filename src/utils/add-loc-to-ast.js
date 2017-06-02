// @flow

import {getCurrentLocation} from '../babel-types';

function addLocToAst(_ast: BabelNode, line: number = getCurrentLocation().start.line) {
  const ast = (_ast: Object);
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
export default addLocToAst;
