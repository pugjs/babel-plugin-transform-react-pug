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

const ExpectedError = /Unescaped attributes/;

test('throws error when pass string', () => {
  const wrapped = () =>
    transformer(`
    div(name!="hello")
  `);

  expect(wrapped).toThrowError(ExpectedError);
});

test('throws error when pass number', () => {
  const wrapped = () =>
    transformer(`
    div(name!=42)
  `);

  expect(wrapped).toThrowError(ExpectedError);
});

test('throws error when pass variable', () => {
  const wrapped = () =>
    transformer(`
    - const variable = 'value'
    div(name!=variable.toString())
  `);

  expect(wrapped).toThrowError(ExpectedError);
});

test('does not throw error when pass variable or just string', () => {
  const wrapped = () =>
    transformer(`
    - const variable = 'value'
    div#id.class(
      data-string="hello"
      data-variable=variable
      data-number=42
    )
      div(class=['one', 'two'])
  `);

  expect(wrapped).not.toThrowError(ExpectedError);
});

test('does not throw error when pass boolean variables', () => {
  const wrapped = () =>
    transformer(`
    div(data-first data-second data-third)
  `);

  expect(wrapped).not.toThrowError(ExpectedError);
});
