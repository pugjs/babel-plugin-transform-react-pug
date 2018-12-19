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

    each list, index in [[1, 2, 3], ['a', 'b', 'c']]
      each item in list
        div(key=item + index data-value=item)

    each list in [[1, 2, 3], 'text']
      if Array.isArray(list)
        each item in list
          p(key=item)= item

    each i in [1, 2]
      - const anotherArray = ['a', 'b', 'c']
      each item, index in anotherArray
        p(key=index)= item

    each i in [1, 2]
      div(key=i)= i
      div(key=i + 10)= i
`;
