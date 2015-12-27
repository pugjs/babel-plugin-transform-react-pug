import lex from 'pug-lexer';
import parse from 'pug-parser';
import filters from 'pug-filters';

export default function (str) {
  return filters.handleFilters(parse(lex(str)));
}
