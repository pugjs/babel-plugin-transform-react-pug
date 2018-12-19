import React from 'react';
import ReactServer from 'react-dom/server';
import renderer from 'react-test-renderer';
import {transformFileSync} from '@babel/core';
import prettier from 'prettier';
import transformReactPug from '../';

const formatCode = input =>
  prettier.format(input, {
    parser: 'babylon',
  });

export function mockConsoleErrors() {
  const consoleError = console.error.bind(console);

  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = consoleError;
  });
}

export function testCompileError(filename) {
  test('Expect an error to be thrown', () => {
    try {
      transformFileSync(filename, {
        babelrc: false,
        plugins: [transformReactPug],
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
          require('babel-plugin-transform-react-jsx'),
        ],
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

export default (filename, options = {}) => {
  test('JavaScript output', () => {
    const formattedCode = formatCode(
      transformFileSync(filename, {
        babelrc: false,
        plugins: [[transformReactPug, options]],
      }).code,
    );

    expect(formattedCode).toMatchSnapshot('transformed source code');
  });
  test('html output', () => {
    const src = transformFileSync(filename, {
      babelrc: false,
      plugins: [
        [transformReactPug, options],
        require('babel-plugin-transform-react-jsx'),
      ],
    }).code;
    const m = {exports: {}};
    Function('React,module', src)(React, m);
    expect(renderer.create(m.exports).toJSON()).toMatchSnapshot(
      'generated html',
    );
  });
  test('static html output', () => {
    const src = transformFileSync(filename, {
      babelrc: false,
      plugins: [
        [transformReactPug, options],
        require('babel-plugin-transform-react-jsx'),
      ],
    }).code;
    const m = {exports: {}};
    Function('React,module', src)(React, m);
    expect(ReactServer.renderToStaticMarkup(m.exports)).toMatchSnapshot(
      'static html',
    );
  });
};
