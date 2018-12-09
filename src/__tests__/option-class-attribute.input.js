const name = 'jack';

module.exports = pug`
  div.first-a.first-b
    p.second-a.second-b(class="second-c second-d")
    p.third-a.third-b(
      styleName="third-c third-d"
      className="third-e third-f"
    )
    p(styleName="fourth-a fourth-b")
    p(className="fivth-a fivth-b")
    p.one(styleName="two")

    each item in [1, 2, 3]
      p.seventh-a.seventh-b(
        key=item
        className="seventh-i-" + item
      )
`;
