import testHelper from './test-helper';

describe('with each', () => {
  testHelper(__dirname + '/react-fragment-each.input.js');
});

describe('with if', () => {
  testHelper(__dirname + '/react-fragment-if.input.js');
});

describe('with inline javascript', () => {
  testHelper(__dirname + '/react-fragment-inline-js.input.js');
});

describe('basic', () => {
  testHelper(__dirname + '/react-fragment.input.js');
});
