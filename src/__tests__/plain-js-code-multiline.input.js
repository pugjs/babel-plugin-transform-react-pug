const log = text => text;

module.exports = pug`
  - const greeting = 'hello'
  - log(greeting)
`;
