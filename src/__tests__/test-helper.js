import React from 'react';
import renderer from 'react-test-renderer';
import {transformFileSync} from 'babel-core';
import transformReactPug from '../';

export default filename => {
  test('JavaScript output', () => {
    expect(transformFileSync(filename, {
      babelrc: false,
      plugins: [
        transformReactPug,
      ]
    }).code).toMatchSnapshot('transformed source code');
  });
  test('html output', () => {
    const src = transformFileSync(filename, {
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
};
