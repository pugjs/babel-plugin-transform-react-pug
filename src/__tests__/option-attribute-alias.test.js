import testHelper, {testCompileError} from './test-helper';

testCompileError(__dirname + '/option-attribute-alias.input.js');

testHelper(__dirname + '/option-attribute-alias.input.js', {
  attributeAlias: {
    class: 'className',
    '@click': 'onClick',
    '@html': 'dangerouslySetInnerHTML',
  },
});
