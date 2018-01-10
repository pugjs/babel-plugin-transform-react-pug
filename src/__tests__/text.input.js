'use strict';

module.exports = pug`
  div
    | Hello World
    | What a great world it is
    if (10 < 15)
      //- Added a double space at the end of the next line
      //- because the "if" means this is not a continuous
      //- run of text. This is consistent with pug behaviour.
      |  The world is great
    div.
      Longer passages of text work
      exactly the same.
`;
