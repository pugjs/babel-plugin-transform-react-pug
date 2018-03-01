// @noflow

import type Context from '../context';
import parse from './parse';
import addLocToAst from './add-loc-to-ast';

export default function parseStatement(src: string, context: Context) {
  const val = parse(src, context);
  if (val.length !== 1) {
    const err = context.error('INVALID_EXPRESSION', 'There was an error parsing the expression "' + src + '".');
    throw err;
  }
  addLocToAst(val[0]);
  return val[0];
}
