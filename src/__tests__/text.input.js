'use strict';

module.exports = pug`
  div
    | Hello World
    | What a great world it is
    if (10 < 15)
      | The world is great
    div.
      Longer passages of text work
      exactly the same.
`;
