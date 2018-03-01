module.exports = pug`
  div
    each list, i in [[1, 2, 3], [], null]
      div(key=i)
        each item in list
          span(key=item)= item
        else
          | No items in this list
        each item in list
          span(key=item)= item
        else
          | This is #[strong literally] the same list!
`;
