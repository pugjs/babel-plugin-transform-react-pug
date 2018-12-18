let n = 0;

module.exports = pug`
  while n < 3
    div(key=n)= n++
`;
