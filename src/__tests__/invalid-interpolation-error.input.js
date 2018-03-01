const name = 'jack';

module.exports = pug`div(name="this${name}isnotallowed")`;
