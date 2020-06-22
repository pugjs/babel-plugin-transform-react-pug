const $ = {Red: 'color-red'};
const classes = 'd2 d3';
const classesArray = ['f3', $.Red];
const showK = true;
const showL = false;
const handleClick = () => {};
const svgGroup = '<g></g>';

module.exports = pug`
  div.a1
    p.b1.b2(class="b3 b4")
    p.c1(className="c2 c3")
    p.d1(class=classes)
    p.e1(class=['e2', 'e3'])
    p.f1(class=['f2', ...classesArray])
    p(class=$.Red)
    p(class=${`g1 ${$.Red}`})
    p.i1(class=${`i2 ${$.Red}`})
    p.j1(
      class="j2 j3",
      className="j4 j5")
    p(class=(showK && "k1"))
    p.l1(class=(showL ? "l2" : ""))
    a.m1(@click=handleClick)
    svg.n1(@html={ __html: "<g></g>" })
    svg.o1(@html={ __html: svgGroup })
`;
