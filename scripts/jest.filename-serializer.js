const path = require('path');
const basedir = path.resolve(__dirname + '/..').replace(/\\/g, '/');

function matchesBasedir(value) {
  return (
    typeof value === 'string' &&
    value.replace(/\\/g, '/').indexOf(basedir) !== -1
  );
}
function removeBasedir(value) {
  const index = value.replace(/\\/g, '/').indexOf(basedir);
  return (
    value.substr(0, index) +
    '<basedir>' +
    value
      .substr(index + basedir.length)
      .replace(/^[\/a-z\-\_\.]+/g, _ => _.replace(/\\/g, '/'))

      // When we run tests inside /dist directory we must ask Jest
      // to match snapshots with what we had in /src dir
      .replace(/^\/dist/, '/src')
  );
}
// filename serializer that removes the basedir
module.exports = {
  test: function(val) {
    return matchesBasedir(val);
  },
  print: function(val, serialize, indent) {
    return serialize(removeBasedir(val));
  },
};
