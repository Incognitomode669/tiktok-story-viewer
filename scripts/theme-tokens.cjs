// eslint-disable-next-line @typescript-eslint/no-require-imports -- PostCSS loads this CommonJS plugin with require.
const { Rule } = require("postcss");
// Keep @theme token syntax without installing Tailwind.
module.exports = () => ({
  postcssPlugin: "theme-tokens",
  AtRule: { theme(atRule) {
    const root = new Rule({ selector: ":root" });
    root.append(atRule.nodes);
    atRule.replaceWith(root);
  } },
});
module.exports.postcss = true;
