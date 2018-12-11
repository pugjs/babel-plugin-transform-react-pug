import testHelper from './test-helper';

describe('basic', () => {
  testHelper(__dirname + '/react-fragment.input.js');
});

describe('with inline javascript', () => {
  testHelper(__dirname + '/react-fragment-inline-js.input.js');
});

describe('with each', () => {
  testHelper(__dirname + '/react-fragment-each.input.js');
});
