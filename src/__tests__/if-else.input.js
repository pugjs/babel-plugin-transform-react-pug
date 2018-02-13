module.exports = pug`
  div
    each v, i in [1, 2, 3]
      div(key=i)
        if v === 1
          | One
        else if v === 2
          | Two
        else
          | Many
        if v === 3
          strong Three
          | is the magic number!
        if v ==  2
        else
          strong Definitely
          | not 2
`;
