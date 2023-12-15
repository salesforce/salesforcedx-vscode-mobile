/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as path from 'path';

import {
    downloadAndUnzipVSCode,
    resolveCliArgsFromVSCodeExecutablePath,
    runTests
} from '@vscode/test-electron';
import { spawnSync } from 'child_process';
import { CORE_EXTENSION_ID } from '../utils/constants';

// There's a known issue (https://github.com/microsoft/vscode/issues/200895)
// with VSCode 1.85.1 and running tests on Windows. We'll stick with an
// explicit working version for now. TODO: change this back to 'stable' when
// the problem is resolved.
// const VSCODE_VERSION = 'stable';
const VSCODE_TEST_VERSION = '1.84.2';

async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');

        // The path to test runner
        // Passed to --extensionTestsPath
        const extensionTestsPath = path.resolve(__dirname, './suite/index');

        if (process.argv.indexOf('--coverage') >= 0) {
            // Add code coverage
            process.env['CODE_COVERAGE'] = '1';
        }

        // Download VS Code, unzip it and run the integration tests.
        // NB: We'll use the 'stable' version of VSCode for tests, to catch
        // potential incompatibilities in newer versions than the minmum we
        // support in the `engines` section of our package.
        const vscodeExecutablePath =
            await downloadAndUnzipVSCode(VSCODE_TEST_VERSION);
        const [cliPath, ...args] =
            resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);

        // Install the Salesforce Extensions, which is a pre-req for our
        // extension. Bail if there's an error.
        const installExtensionDepsOuput = spawnSync(
            cliPath,
            [...args, '--install-extension', CORE_EXTENSION_ID],
            { stdio: 'inherit', encoding: 'utf-8' }
        );
        if (installExtensionDepsOuput.error) {
            console.error(
                `Error installing Salesforce Extensions in test: ${installExtensionDepsOuput.error.message}`
            );
            throw installExtensionDepsOuput.error;
        }
        if (
            installExtensionDepsOuput.status &&
            installExtensionDepsOuput.status !== 0
        ) {
            const installNonZeroError = `Install of Salesforce Extensions finished with status ${installExtensionDepsOuput.status}. See console output for more information.`;
            console.error(installNonZeroError);
            throw new Error(installNonZeroError);
        }

        // All clear! Should be able to run the tests.
        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            vscodeExecutablePath
        });
    } catch (err) {
        console.error('Failed to run tests', err);
        process.exit(1);
    }
}

main();
