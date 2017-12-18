module.exports = {
  presets: [['@babel/env', {
    targets: { node: 6 },
    loose: true
  }]],
  plugins: ['module:param.macro/plugin']
}
