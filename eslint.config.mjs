import globals from "globals";
import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    languageOptions: {
      // Update to Node.js globals
      globals: globals.node,     
      ecmaVersion: 2021,          // Allows modern JavaScript syntax
      sourceType: "module"        // Allows ES modules (optional, depending on usage)
    },
    plugins: {
      js: pluginJs
    },
    rules: {
      // Add any custom rules here, if needed
    },
    // Use the recommended configuration for JavaScript
    ...pluginJs.configs.recommended,
  }
];
