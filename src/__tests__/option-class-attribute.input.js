const name = 'jack';

module.exports = pug`
  div.first-a.first-b
    p.second-a.second-b(class="second-c second-d")
    p.third-a.third-b(
      class="third-c third-d"
      styleName="third-e third-f"
      className="third-g third-h"
    )
    p(styleName="fourth-a fourth-b")
    p(className="fivth-a fivth-b")

    each item in [1, 2, 3]
      p.seventh-a.seventh-b(key=item class="seventh-i-" + item)
`;
