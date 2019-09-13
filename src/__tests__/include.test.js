import testHelper from './test-helper';

describe('without extname', () => {
  testHelper(__dirname + '/include.input.js');
});

describe('with extname', () => {
  testHelper(__dirname + '/include-extname.input.js');
});

describe('with space', () => {
  testHelper(__dirname + '/include-space.input.js');
});
