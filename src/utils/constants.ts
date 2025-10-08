/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
export const MINIMUM_REQUIRED_VERSION_CORE_EXTENSION = '58.4.1';
export const CORE_EXTENSION_ID = 'salesforce.salesforcedx-vscode-core';
export const SFDX_PROJECT_FILE = 'sfdx-project.json';
export const PACKAGE_JSON = 'package.json';
export const JSON_INDENTATION_SPACES = 2;

// Legacy ESLint configuration file for eslint < 9.x
export const ESLINT_RC_FILE = '.eslintrc.json';

// Default eslint 9 flat configuration file
export const ESLINT_CONFIG_FILE = 'eslint.config.js';
export const ESLINT_CONFIG_FILE_CONTENT_WITH_USER_CONFIG = `
const { defineConfig } = require("eslint/config");
const eslintConfigMobile = require('./eslint.config.mobile');
const eslintConfigUser = require('./eslint.config.user');

module.exports = defineConfig([
    ...eslintConfigUser,
    ...eslintConfigMobile
]);
`;
export const ESLINT_CONFIG_FILE_CONTENT_WITHOUT_USER_CONFIG = `
const { defineConfig } = require("eslint/config");
const eslintConfigMobile = require('./eslint.config.mobile');

module.exports = defineConfig([
    ...eslintConfigMobile,
]);
`;

// Mobile eslint configuration file
export const ESLINT_CONFIG_MOBILE_FILE = 'eslint.config.mobile.js';
export const ESLINT_CONFIG_MOBILE_FILE_CONTENT = `
const eslintJs = require("@eslint/js");
const { defineConfig } = require("eslint/config");
const lwcMobilePlugin = require("@salesforce/eslint-plugin-lwc-mobile");
const lwcGraphAnalyzerPlugin = require("@salesforce/eslint-plugin-lwc-graph-analyzer");

module.exports = defineConfig([
  // Salesforce LWC Mobile plugin configuration
  {
    files: ["**/lwc/**/*.js"],
    plugins: {
      eslintJs,
      "@salesforce/lwc-mobile": lwcMobilePlugin,
      "@salesforce/lwc-graph-analyzer": lwcGraphAnalyzerPlugin
    },
    extends: [
      eslintJs.configs.recommended,
      lwcMobilePlugin.recommendedConfigs,
      lwcGraphAnalyzerPlugin.configs.recommended
    ]
  }
]);
`;

// User eslint configuration file, contains the original eslint.config.js file content after ConfigureLintingToolsCommand's execution
export const ESLINT_CONFIG_USER_FILE = 'eslint.config.user.js';
