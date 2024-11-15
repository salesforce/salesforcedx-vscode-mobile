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

// @ts-ignore
import * as baseConfig from '@istanbuljs/nyc-config-typescript';

const NYC = require('nyc');

let nyc: any = undefined;

interface FilePath {
    directory: string;
    fileName: string;
}

export async function run(): Promise<void> {
    if (process.env['CODE_COVERAGE'] === '1') {
        nyc = new NYC({
            ...baseConfig,
            cwd: path.join(__dirname, '..', '..', '..'),
            reporter: ['text-summary', 'html', 'text', 'lcov', 'json'],
            all: true,
            silent: false,
            instrument: true,
            hookRequire: true,
            include: [
                'out/**/*.js',
                'lsp/client/out/**/*.js',
                'lsp/server/out/**/*.js'
            ],
            exclude: [
                'out/test/**',
                'lsp/client/out/test/**',
                'lsp/server/out/test/**'
            ]
        });
        await nyc.wrap();
        await nyc.createTempDirectory();
    }

    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd',
        timeout: 10 * 1000,
        color: true
    });

    const testsRoot = path.resolve(__dirname, '..');
    const testsLSPClient = path.resolve(
        __dirname,
        '../../../lsp/client/out/test'
    );
    const testsLSPServer = path.resolve(
        __dirname,
        '../../../lsp/server/out/test'
    );

    return new Promise((c, e) => {
        const testDirs = [testsRoot, testsLSPClient, testsLSPServer];
        Promise.all(
            testDirs.map(
                (dir) =>
                    new Promise<FilePath[]>((resolveGlob, rejectGlob) => {
                        glob(
                            '**/**.test.js',
                            { cwd: dir },
                            async (err, files) => {
                                if (err) {
                                    return rejectGlob(err);
                                }
                                resolveGlob(
                                    //Converts file name into FilePath
                                    files.map((fileName) => {
                                        return { directory: dir, fileName };
                                    })
                                );
                            }
                        );
                    })
            )
        )
            .then((testPathsArray) => {
                const allTests = testPathsArray.flat();
                allTests.forEach((testPath) => {
                    mocha.addFile(
                        path.resolve(testPath.directory, testPath.fileName)
                    );
                });
                try {
                    // Run the mocha test
                    mocha.run(async (failures) => {
                        if (failures > 0) {
                            e(new Error(`${failures} tests failed.`));
                        } else {
                            if (process.env['CODE_COVERAGE'] === '1') {
                                await nyc.writeCoverageFile();

                                // nyc text report is output to process.stdout and using plain console.log
                                // will not output to terminal. Overriding process.stdout to pipe the output
                                // to console.log.
                                console.log(
                                    await pipeNycReport(nyc.report.bind(nyc))
                                );
                            }
                            c();
                        }
                    });
                } catch (err) {
                    console.error(err);
                    e(err);
                }
            })
            .catch((err) => {
                console.error(err);
                e(err);
            });
    });
}

async function pipeNycReport(callback: any): Promise<string> {
    // Preserve original write function
    let oldWriteFunc = process.stdout.write;

    // Create a string buffer to stash report output
    let reportText = '';
    process.stdout.write = (text: string) => {
        reportText = reportText.concat(text);
        return true;
    };
    await callback();

    // Revert to original write function
    process.stdout.write = oldWriteFunc;

    return Promise.resolve(reportText);
}
