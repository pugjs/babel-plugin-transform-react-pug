module.exports = pug`
  div
    each a in [1,2,3]
      - const name = 'a';
      div(key=a)= name + ':' + a
        each b in [1,2,3]
          - const name = 'b';
          div(key=b)= name + ':' + b
        each c, i in [1,2,3]
          - const name = 'c';
          div(key=c)= name + c
`;
