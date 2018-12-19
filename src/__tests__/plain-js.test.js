import testHelper from './test-helper';

describe('code', () => {
  testHelper(__dirname + '/plain-js-code.input.js');
});

describe('code-multiline', () => {
  testHelper(__dirname + '/plain-js-code-multiline.input.js');
});

describe('if', () => {
  testHelper(__dirname + '/plain-js-if.input.js');
});

describe('each', () => {
  testHelper(__dirname + '/plain-js-each.input.js');
});

describe('each-multiple', () => {
  testHelper(__dirname + '/plain-js-each-multiple.input.js');
});

describe('while', () => {
  testHelper(__dirname + '/plain-js-while.input.js');
});

describe('case', () => {
  testHelper(__dirname + '/plain-js-case.input.js');
});
