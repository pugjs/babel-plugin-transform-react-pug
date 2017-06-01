import React from 'react';
import renderer from 'react-test-renderer';
import {transformFileSync} from 'babel-core';
import transformReactPug from '../';

test('it should handle const variables', () => {
  expect(transformFileSync(__dirname + '/nested-loops.input.js', {
    babelrc: false,
    plugins: [
      transformReactPug,
    ]
  }).code).toMatchSnapshot('transformed source code');
  const src = transformFileSync(__dirname + '/nested-loops.input.js', {
    babelrc: false,
    plugins: [
      transformReactPug,
      require("babel-plugin-transform-react-jsx"),
    ]
  }).code;
  const m = {exports: {}};
  Function('React,module', src)(React, m);
  expect(renderer.create(m.exports).toJSON()).toMatchSnapshot('generated html');
});
