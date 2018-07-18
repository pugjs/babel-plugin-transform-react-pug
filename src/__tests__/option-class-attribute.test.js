import testHelper, {mockConsoleErrors} from './test-helper';

mockConsoleErrors();

testHelper(__dirname + '/option-class-attribute.input.js');

testHelper(__dirname + '/option-class-attribute.input.js', {
  classAttribute: 'styleName',
});
