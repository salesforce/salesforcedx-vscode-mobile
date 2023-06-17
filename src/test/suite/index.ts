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
        // hookRunInContext: true,
        // hookRunInThisContext: true,
        // useSpawnWrap: false,
        include: ['out/**/*.js'],
        exclude: ['out/test/**'],
    });
    await nyc.wrap();

    // Object.keys(require.cache)
    // .filter(f => nyc.exclude.shouldInstrument(f) )
    // .forEach(m => {
    //     console.warn('Module loaded before NYC, invalidatingaaa:', m);
    //     //delete require.cache[m];
    //     decache(m);
    //     require(m);
    //   });

    const myFilesRegex = /salesforce-offline-vscode\/out/;
  const filterFn = myFilesRegex.test.bind(myFilesRegex);
  if (Object.keys(require.cache).filter(filterFn).length > 1) {
    console.warn('NYC initialized after modules were loaded', Object.keys(require.cache).filter(filterFn));
  }
  await nyc.createTempDirectory();

    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd',
        timeout: 10 * 1000,
        color: true
    });

    // return new Promise((c, e) => {
    //     glob('**/**.test.js', { cwd: testsRoot }, async (err, files) => {
    //         if (err) {
    //             return e(err);
    //         }

    //         // Add files to the test suite
    //         files.forEach((f) => {
    //             const pathName = path.resolve(testsRoot, f);
    //             console.error(pathName);

    //             mocha.addFile(path.resolve(testsRoot, f));

    //         });

    //         try {
    //             // Run the mocha test
    //             mocha.run( async (failures) => {
    //                 if (failures > 0) {
    //                     e(new Error(`${failures} tests failed.`));
    //                 } else {
    //                     c();
    //                 }
    //             });
    //         } catch (err) {
    //             console.error(err);
    //             e(err);
    //         }
    //     });
    // });

    // Add all files to the test suite
    const files = glob.sync('**/*.test.js', { cwd: testsRoot });
    files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

    const failures: number = await new Promise((resolve) => mocha.run(resolve));
    await nyc.writeCoverageFile();

    // Capture text-summary reporter's output and log it in console
    console.log(await captureStdout(nyc.report.bind(nyc)));

    if (failures > 0) {
        throw new Error(`${failures} tests failed.`);
    }
}

async function captureStdout(fn: any) {
    let w = process.stdout.write,
        buffer = '';
    process.stdout.write = (s) => {
        buffer = buffer + s;
        return true;
    };
    await fn();
    process.stdout.write = w;
    return buffer;
}
