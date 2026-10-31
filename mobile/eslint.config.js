const expoConfig = require("eslint-config-expo/flat");
const { defineConfig } = require("eslint/config");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [".expo/**", "dist/**"],
    rules: {
      // Mobile screens load API/storage state on mount. Those effects are
      // intentional external synchronization, not derived-state effects.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
