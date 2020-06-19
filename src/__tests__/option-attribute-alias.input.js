const classes = ['e2', 'e3'];
const showG = true
const showH = false
const handleClick = () => {};
const svgGroup = '<g></g>';

module.exports = pug`
  div.a1
    p.b1.b2(class="b3 b4")
    p.c1(className="c2 c3")
    p.d1(class=['d2', 'd3'])
    p.e1(class=classes)
    p.f1(
      class="f2 f3",
      className="f4 f5"
    )
    p.g1(class=(showG && "g2"))
    p.h1(class=(showH && "h2"))
    a.i1(@click=handleClick)
    svg.j1(@html={ __html: "<g></g>" })
    svg.k1(@html={ __html: svgGroup })
`;
