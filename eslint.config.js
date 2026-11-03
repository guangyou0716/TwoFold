// ESLint 9 flat config for the Expo app.
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      "dist/*",
      "node_modules/*",
      // Cloud Functions and its generated assets live in a separate package.
      "functions/**",
    ],
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      globals: {
        Buffer: "readonly",
        __dirname: "readonly",
      },
    },
  },
  {
    // Jest globals for the jest setup file and the app's test files.
    files: ["jest.setup.js", "**/*.test.ts", "**/*.test.tsx"],
    languageOptions: {
      globals: {
        jest: "readonly",
        describe: "readonly",
        test: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
      },
    },
  },
  {
    rules: {
      // Existing screens subscribe to Firestore in effects and derive timer
      // values during callbacks; keep these React Compiler advisories from
      // blocking the app's established native patterns.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
    },
  },
]);
