module.exports = {
  extends: [
    "forbeslindesay",
    "plugin:flowtype/recommended"
  ],
  plugins: [
    "flowtype"
  ],
  settings: {
    flowtype: {
      onlyFilesWithFlowAnnotation: true
    }
  },
  globals: {
    pug: true
  }
};
