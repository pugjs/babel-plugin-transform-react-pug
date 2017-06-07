'use strict';

module.exports = new (function() {
  this.names = ['jack', 'john'];
    
  return pug`
    div
      ${ this.names.map((name, key) => pug`p(key=${key})= name`) }
  `
})();
