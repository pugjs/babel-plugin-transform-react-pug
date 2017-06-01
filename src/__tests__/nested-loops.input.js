'use strict';

module.exports = pug`
  div
    each a in [1,2,3]
      div(key=a)= a
        each b in [1,2,3]
          div(key=b)= b
        each c, i in [1,2,3]
          div(key=c)= c
`;
