import testHelper from './test-helper';

const consoleError = console.error.bind(console);
beforeAll(() => (console.error = jest.fn()));
afterAll(() => (console.error = consoleError));

testHelper(__dirname + '/option-class-attribute.input.js', {
  classAttribute: 'styleName',
});
