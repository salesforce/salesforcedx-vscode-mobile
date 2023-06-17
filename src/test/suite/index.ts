/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

'use strict';

import * as Mocha from 'mocha';
import * as path from 'path';
import * as glob from 'glob';
import * as baseConfig from '@istanbuljs/nyc-config-typescript';

const NYC = require('nyc');

export async function run(): Promise<void> {
    const testsRoot = path.resolve(__dirname, '..');

    // Setup coverage pre-test, including post-test hook to report

    const nyc = new NYC({
        ...baseConfig,
        cwd: path.join(__dirname, '..', '..', '..'),
        reporter: ['text-summary', 'html', 'text'],
        all: true,
        silent: false,
        instrument: true,
        hookRequire: true,
        include: ['out/**/*.js'],
        exclude: ['out/test/**'],
    });
    await nyc.wrap();

//     const myFilesRegex = /salesforce-offline-vscode\/out/;
//       const filterFn = myFilesRegex.test.bind(myFilesRegex);
//   if (Object.keys(require.cache).filter(filterFn).length > 1) {
//     console.warn('NYC initialized after modules were loaded', Object.keys(require.cache).filter(filterFn));
//   }
  await nyc.createTempDirectory();

    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd',
        timeout: 10 * 1000,
        color: true
    });

    return new Promise((c, e) => {
        glob('**/**.test.js', { cwd: testsRoot }, async (err, files) => {
            if (err) {
                return e(err);
            }

            // Add files to the test suite
            files.forEach((f) => {
                mocha.addFile(path.resolve(testsRoot, f));
            });

            try {
                // Run the mocha test
                mocha.run(async (failures) => {
                    if (failures > 0) {
                        e(new Error(`${failures} tests failed.`));
                    } else {
                        await nyc.writeCoverageFile();

                        // nyc text report is output to process.stdout and using plain console.log
                        // will not output to terminal. Overriding process.stdout to pipe the output
                        // to console.log.
                        console.log(await pipeNycReport(nyc.report.bind(nyc)));
                        c();
                    }
                });
            } catch (err) {
                console.error(err);
                e(err);
            }
        });
    });
}

async function pipeNycReport(callback: any):Promise<string> {
    // Preserve original write function
    let oldWriteFunc = process.stdout.write;

    // Create a string buffer to stash report output
    let reportText = '';
    process.stdout.write = (text) => {
        reportText = reportText.concat(text);
        return true;
    };
    await callback();

    // Revert to original write function
    process.stdout.write = oldWriteFunc;

    return Promise.resolve(reportText);
}
