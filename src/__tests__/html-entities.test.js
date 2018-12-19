import {transformFileSync} from '@babel/core';
import transformReactPug from '../';
import transformReactJsx from '@babel/plugin-transform-react-jsx';

const FILENAME = __dirname + '/html-entities.input.js';

const transform = (...plugins) =>
  transformFileSync(FILENAME, {
    babelrc: false,
    compact: false,
    plugins: [transformReactPug, ...plugins],
  }).code;

test('JavaScript output', () => {
  const src = transform();
  expect(src).toMatchSnapshot('transformed source code');
});

test('JSX output', () => {
  const src = transform(transformReactJsx);
  expect(src).toMatchSnapshot('generated JSX');
});
