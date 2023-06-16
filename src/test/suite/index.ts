/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

'use strict';

import * as path from 'path';
import * as Mocha from 'mocha';
const NYC = require('nyc');
import * as glob from 'glob';

// // Simulates the recommended config option
// // extends: "@istanbuljs/nyc-config-typescript",
import * as baseConfig from '@istanbuljs/nyc-config-typescript';

// Recommended modules, loading them here to speed up NYC init
// and minimize risk of race condition
import 'ts-node/register';
import 'source-map-support/register';

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
        //hookRunInContext: true,
        // hookRunInThisContext: true,
        include: ['out/**/*.js']
        // exclude: ['out/test/**', 'out/test/*']
    });
    // await nyc.reset();
    await nyc.wrap();

    // Object.keys(require.cache).filter(f => nyc.exclude.shouldInstrument(f)).forEach(m => {
    //     console.warn('Module loaded before NYC, invalidating:', m);
    //     delete require.cache[m];
    //     require(m);
    //   });

    // Debug which files will be included/excluded
    console.error('Glob verification', await nyc.exclude.glob(nyc.cwd));

    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd',
        // timeout: 10 * 1000
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
