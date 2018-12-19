module.exports = pug`
  each item in [1, 2, 3]
    div(key=item)= item

  each item in [1, 2, 3]
    div(key=item)= item
`;
