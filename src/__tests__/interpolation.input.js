'use strict';

module.exports = new (function() {
  this.message = 'Hello everyone';
  this.names = ['jack', 'john'];
  let showName = true;  
  
  return pug`
    div Names
      if ${showName}
        p My name is ${this.names[0]}
      h1 ${this.message}
      h2 First person is ${this.names[0]}
      ${ this.names.map((name, key) => pug`p(key=${key}) Hi ${name}, bye ${name}`) }
  `
})();
