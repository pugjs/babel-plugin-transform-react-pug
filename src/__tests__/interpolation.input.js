'use strict';

const Person = ({name}) => {
  return pug`
    .person.person__profile
      h2 My name is ${name}
  `;
};

module.exports = new function() {
  this.message = 'Hello everyone';
  this.names = ['jack', 'john'];
  let showFirstPerson = true;

  return pug`
    .people.people__container
      h1 ${this.message}
      p 
        | Here is a list of people that you might want to follow,
        | one being ${this.names[1]}!
      if ${showFirstPerson}
        ${Person}(name=${this.names[0]})
      ${this.names.map(
        (name, key) => pug`p(key=${key}) Hi ${name}, bye ${name}`,
      )}
  `;
}();
