module.exports = pug`
  div
    - let x = 1;
    - x = x + 40;
    - x++;
    div= x
`;
