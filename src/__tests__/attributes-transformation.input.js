const object = {
  first: 'one-in-object',
  second: 'two-in-object',
};

module.exports = pug`
  div
    .basic
    div.basic
    div(className="basic")
    .one.two
    div(className="one two")

    div(className=['arr', 'one-in-array', 'two-in-array'])
    div(className=['arr', object.first, object.second])
    div(className=['join', object.first, object.second].join(' '))
    div(other=['arr', 'one-in-other', 'two-in-other'])
    div(other=['arr', object.first, object['second']])
    div(other=['join', object.first, object['second']].join(' '))

    .mixed-str-1(className="mixed-str-2 mixed-str-3")
    .mixed-arr-1(className=['mixed-arr-2', 'mixed-arr-3'])
    .mixed-arr-join-1(className=['mixed-arr-join-2', 'mixed-arr-join-3'].join(' '))
`;
