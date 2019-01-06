import React from 'react';
import {transform} from '@babel/core';
import renderer from 'react-test-renderer';
import transformReactPug from '../';

const transformationOptions = {
  babelrc: false,
  plugins: [transformReactPug],
};

const transformer = code => {
  return transform(`pug\`${code}\``, transformationOptions).code;
};

const ExpectedError = /We can't use expressions in shorthands, use "className" instead of "class"/;

describe('throws error when', () => {
  it('is number', () => {
    const result = () => transformer(`div(class=42)`);

    expect(result).toThrowError(ExpectedError);
  });

  it('is array', () => {
    const result = () => transformer(`div(class=[1, 2])`);

    expect(result).toThrowError(ExpectedError);
  });

  it('is variable', () => {
    const result = () => transformer(`div(class=test)`);

    expect(result).toThrowError(ExpectedError);
  });
});

describe('does not throw error when', () => {
  it('is string', () => {
    const result = () => transformer(`div(class="text")`);

    expect(result).not.toThrowError();
  });
});
