# babel-plugin-transform-react-pug

The official means by which you can use pug in your react components, replaces the use of react-jade when moving to pug.

This plugin transforms the pug inside of your react components.

## Installation
```
npm install babel-plugin-transform-react-pug
```
## Usage
.babelrc
```js
{
  "presets": ["forbeslindesay"],
  "plugins": [
    "transform-react-pug",
  ]
}
```
## Examples

### Example 1
You can now create a react component with your pug inside it.
```js
import React from 'react';

class MyComponent extends React.Component {

  render() {
    return pug`
      div
        h1 My Component
        p This is my component using pug.
    `;
  }
}
```
###Example 2
You can create a pug constant that you can simply re-use in your code.
```js
import React from 'react';

class MyComponent extends React.Component {

  _onDoOneThing = () => {
    console.dir('Do one thing');
  };

  _onDoAnotherThing = () => {
    console.dir('Do Another thing');
  };

  render() {

    const myButtons = pug`
      div
        button(onClick=this._onDoOneThing) Do One Thing
        = ' '
        button(onClick=this._onDoAnotherThing) Do Another Thing
    `;

    return pug`
      div
        h1 MyComponent
        p this component uses buttons from my constant.
        div
          = myButtons
    `
  }
}
```
