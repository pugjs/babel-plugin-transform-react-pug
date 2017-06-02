import React from 'react';
import renderer from 'react-test-renderer';
import {transformFileSync} from 'babel-core';
import transformReactPug from '../';

export function testCompileError(filename) {
  test('Expect an error to be thrown', () => {
    try {
      transformFileSync(filename, {
        babelrc: false,
        plugins: [
          transformReactPug,
        ]
      });
    } catch (ex) {
      expect(ex.message).toMatchSnapshot('');
      return;
    }
    throw new Error('Expected an exception');
  });
}

export function testRuntimeError(filename) {
  test('Expect an error to be thrown', () => {
    try {
      const src = transformFileSync(filename, {
        babelrc: false,
        plugins: [
          transformReactPug,
          require("babel-plugin-transform-react-jsx"),
        ]
      }).code;
      const m = {exports: {}};
      Function('React,module', src)(React, m);
    } catch (ex) {
      expect(ex.message).toMatchSnapshot('');
      return;
    }
    throw new Error('Expected an exception');
  });
}

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
