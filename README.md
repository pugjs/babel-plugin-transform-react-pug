# babel-plugin-transform-react-pug

Use Pug templates to write react components.

It's a plugin for babel which transpiles pug syntax within template literals to jsx.

Write your components this way:

```jsx
export default const ReactComponent = props => pug`
  .wrapper
    if props.shouldShowGreeting
      p.greeting Hello World!

    button(onClick=props.notify) Click Me
`
```

And it will be transpiled into:

```jsx
export default const ReactComponent = props => (
  <div className="wrapper">
    {props.shouldShowGreeting && (
      <p className="greeting">Hello World</p>
    )}
    <button onClick={props.notify}>Click Me</button>
  </div>
)
```

* [Usage](#usage)
  * [Syntax](#syntax)
  * [Eslint integration](#eslint-integration)
  * [CSS Modules](#css-modules)
* [Install](#install)
  * [create-react-app](#create-react-app)
  * [React Native](#react-native)
* [How it works](#how-it-works)
* [Limitations](#limitations)
* [FAQ](#faq)
  * [Can I import template from other files?](#can-i-import-template-from-other-files)
  * [How to get syntax highlighting in IDE (or text editors)?](#how-to-get-syntax-highlighting-in-ide-or-text-editors)
* [License](#license)

## Usage

### Syntax

Full information of the syntax you can find in official documentation: [pugjs.org](https://pugjs.org/).

#### Basic example

```jsx
const Component = props => pug`          //- const Component = props => (
  div                                    //-   <div>
    if props.amount > MAX_AMOUNT         //-     {props.amount > MAX_AMOUNT ? (
      OtherComponent(fluid crucial)      //-       <OtherComponent fluid crucial />
    else                                 //-     ) : (
      p You can set bigger amount ;)     //-       <p>You can set bigger amount ;)</p>
                                         //-     )}
    each item, index in props.items      //-     {props.items.map((item, index) => (
      div(key=item.id)                   //-       <div key={item.id}>
        h3 Header #{index + 1}           //-         <h3>Header {index + 1}</h3>
        = item.body                      //-         {item.body}
                                         //-       </div>
                                         //-     )}
                                         //-   </div>
                                         //- )
`;
```

#### How to pass functions and other primitives

```jsx
const Component = props => pug`          //- const Component = props => (
  div                                    //-   <div>
    button(                              //-     <button
      type="button"                      //-       type="button"
      onClick=props.onClick              //-       onClick={props.onClick}
    ) Click Me                           //-     >Click Me</button>
                                         //-
    OtherComponent(                      //-     <OtherComponent
      ...props.objectWithPropsForChild   //-       {...props.objectWithPropsForChild}
      fluid                              //-       fluid
      data-array=[1, 2, 3]               //-       data-array={[1, 2, 3]}
    )                                    //-     />
                                         //-   </div>
                                         //- )
`;
```

#### Define local variables and use javascript in attributes

```jsx
const Component = props => pug`          //- const Component = props => (
  Fragment                               //-   <Fragment>
    button(                              //-     <button
      ...one                             //-       {...one}
      ...two                             //-       {...two}
      onClick=() => alert('Hello')       //-       onClick={() => alert('Hello')}
      text='number ' + 10                //-       text={'number' + 10}
    )                                    //-     ></button>
                                         //-
    - const variable = format(props.no)  //-
    p Variable is #{variable}            //-     <p>Variable is {format(props.no)}</p>
                                         //-   </Fragment>
                                         //- )
`;
```

#### Interpolation

If you'd prefer to use interpolation, you can. This is possible by using `${}` within your template.

```jsx
const Component = props => pug`
  ul(className=${props.modifier})
    ${props.items.map((item, index) => pug`li(key=${index}) ${item}`)}
`;
```

### Eslint integration

Install [eslint-plugin-react-pug](https://github.com/ezhlobo/eslint-plugin-react-pug) if you use [eslint-plugin-react](https://github.com/yannickcr/eslint-plugin-react).

### CSS Modules

It's not supported well yet.

## Install

1.  Install via yarn or npm

    ```
    yarn add --dev babel-plugin-transform-react-pug
    ```

    ```
    npm install --save-dev babel-plugin-transform-react-pug
    ```

2.  Add to babel configuration before transpiling jsx (usually in `.babelrc`)

    ```
    {
      "plugins": [
        "transform-react-pug",
        "transform-react-jsx"
      ]
    }
    ```

3.  Now all your templates written with pug are understood by react and browsers.

### create-react-app

Integrating with [create-react-app][link to cra] is tricky because it does not allow you to modify babel configuration. There are two documented possibilities:

* [eject][link to cra eject]

  That is easy, you will get `.babelrc` file in your root directory, just add `transform-react-pug` before `transform-react-jsx` there.

* [react-app-rewired][link to rewired cra]

  Go through official instruction to rewire your application. Then modify your `config-overrides.js`:

  ```diff
  + const {injectBabelPlugin} = require('react-app-rewired');
    module.exports = function override(config, env) {
  -   //do stuff with the webpack config...
  +   config = injectBabelPlugin('transform-react-pug', config);
      return config;
    }
  ```

[link to cra]: https://github.com/facebook/create-react-app/
[link to cra eject]: https://github.com/facebook/create-react-app/blob/master/packages/react-scripts/template/README.md#npm-run-eject
[link to rewired cra]: https://github.com/timarney/react-app-rewired#1-injectbabelplugin

### React Native

Just add this plugin to the list in `.babelrc` file.

```diff
  {
-   "presets": ["react-native"]
+   "presets": ["react-native"],
+   "plugins": ["transform-react-pug"]
  }
```

_We don't need `transform-react-jsx` here because it's coming with `react-native` preset._

## How it works

_Coming soon..._

## Limitations

* No possibility to use static methods. We have to use `Fragment` instead of `React.Fragment`

_Coming soon..._

## FAQ

### Can I import template from other files?

No.

_Coming soon..._

### How to get syntax highlighting in IDE (or text editors)?

Here is an instruction for Atom text editor.

1.  Install [language-babel](https://atom.io/packages/language-babel) and [language-pug-jade](https://atom.io/packages/language-pug-jade)

    _I suggest language-pug-jade because it works better for me. But there are more approaches for building pugjs grammar: [language-pug](https://atom.io/packages/language-pug) and [atom-pug](https://atom.io/packages/atom-pug), and you can try them too._

2.  Open settings of language-babel in atom
3.  Find the field under "JavaScript Tagged Template Literal Grammar Extensions"
4.  Enter: `pug:source.pug`

    More details: [gandm/language-babel#javascript-tagged-template-literal-grammar-extensions](https://github.com/gandm/language-babel#javascript-tagged-template-literal-grammar-extensions)

5.  Restart the atom

## License

MIT
