import testHelper, {mockConsoleErrors} from './test-helper';

mockConsoleErrors();

testHelper(__dirname + '/option-attribute-alias.input.js', {
  attributeAlias: {
    class: 'className',
    '@click': 'onClick',
    '@html': 'dangerouslySetInnerHTML',
  },
});
