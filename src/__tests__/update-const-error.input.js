module.exports = pug`
  div
    - const x = 1;
    - x = 10;
    - console.log(x);
`;
