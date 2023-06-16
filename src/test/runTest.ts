/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as path from 'path';

import { runTests } from '@vscode/test-electron';

const NYC = require('nyc');
import * as glob from 'glob';

// Simulates the recommended config option
// extends: "@istanbuljs/nyc-config-typescript",
import * as baseConfig from '@istanbuljs/nyc-config-typescript';

// Recommended modules, loading them here to speed up NYC init
// and minimize risk of race condition
import 'ts-node/register';
import 'source-map-support/register';

async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');

        // The path to test runner
        // Passed to --extensionTestsPath

        //const extensionTestsPath = path.resolve(__dirname, './suite/index');
        let extensionTestsPath = path.resolve(__dirname, './suite/index');

        // if (process.argv.indexOf('--coverage') >= 0) {
        //     // generate instrumented files at out-cov
        //     //instrument();
        //     const nyc = new NYC({
        //         ...baseConfig,
        //         //cwd: path.join(__dirname, '..', '..', '..'),
        //         cwd: path.join(__dirname, '..', '..'),
        //         reporter: ['text-summary', 'html', 'text'],
        //         all: true,
        //         silent: false,
        //         instrument: true,
        //         hookRequire: true,
        //         //hookRunInContext: true,
        //         // hookRunInThisContext: true,
        //         include: ['out/**/*.js'],
        //         // exclude: ['out/test/**', 'out/test/*']
        //         //tempDir: 'foo'
        //     });
        //     //await nyc.reset();
        //     await nyc.wrap();
        //     console.error('Glob verification', await nyc.exclude.glob(nyc.cwd));

        //     // load the instrumented files
        //     //extensionTestsPath = path.resolve(__dirname, '../out-cov/test/suite/index');
        //     extensionTestsPath = path.resolve(__dirname, '../test/suite/index');

        //     // signal that the coverage data should be gathered
        //     process.env['GENERATE_COVERAGE'] = '1';
        // }

        // Download VS Code, unzip it and run the integration test
        await runTests({ extensionDevelopmentPath, extensionTestsPath });
    } catch (err) {
        console.error('Failed to run tests', err);
        process.exit(1);
    }
}

main();
