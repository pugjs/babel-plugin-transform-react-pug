import lex from 'pug-lexer';
import parse from 'pug-parser';
import filters from 'pug-filters';
import stripComments from 'pug-strip-comments';

export default function(str) {
  return filters.handleFilters(
    parse(
      stripComments(lex(str), {stripUnbuffered: true, stripBuffered: true}),
    ),
  );
}
