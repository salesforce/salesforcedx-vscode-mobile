/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import * as childProcess from 'node:child_process';
import { Logger } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import * as fs from 'fs';

export class CommonUtils {
    /**
     * Given the path to a JSON file, it will load the content of the file.
     *
     * @param file The path to the JSON file.
     * @returns Content of the file as JSON object.
     */
    public static loadJsonFromFile(file: string): AnyJson {
        const fileContent = fs.readFileSync(file, 'utf8');
        const json = JSON.parse(fileContent) as AnyJson;
        return json;
    }

    /**
     * Execute a command asynchronously using child_process.exec()
     *
     * @param command The command to be executed.
     * @returns A promise containing the results of stdout and stderr
     */
    public static async executeCommandAsync(
        command: string,
        logger?: Logger
    ): Promise<{ stdout: string; stderr: string }> {
        return new Promise<{ stdout: string; stderr: string }>(
            (resolve, reject) => {
                logger?.debug(`Executing command: '${command}'`);
                childProcess.exec(command, (error, stdout, stderr) => {
                    if (error) {
                        logger?.error(`Error executing command '${command}':`);

                        // also include stderr & stdout for more detailed error
                        let msg = error.message;
                        if (stderr && stderr.length > 0) {
                            msg = `${msg}\nstderr:\n${stderr}`;
                        }
                        if (stdout && stdout.length > 0) {
                            msg = `${msg}\nstdout:\n${stdout}`;
                        }

                        logger?.error(msg);
                        reject(error);
                    } else {
                        resolve({ stdout, stderr });
                    }
                });
            }
        );
    }
}
