/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceUtils } from '../../utils/workspaceUtils';

const configureLintingToolsCommand =
    'salesforcedx-vscode-offline-app.configureLintingTools';
const eslintDependencies = [
    ['@salesforce/eslint-plugin-lwc-graph-analyzer', '^0.9.0'],
    ['eslint', '^8.47.0']
];
const lwcGraphAnalyzerRecommended: string =
    'plugin:@salesforce/lwc-graph-analyzer/recommended';
const eslintRecommended = 'eslint:recommended';
const tabSpaces = 2;

interface PackageJson {
    devDependencies?: Record<string, string>;
}

export function onActivate(context: vscode.ExtensionContext) {
    vscode.commands.executeCommand(
        'setContext',
        'sfdx_project_opened',
        WorkspaceUtils.isSfdxProjectOpened()
    );
}

function updateDevDependencies() {
    const packageJson: PackageJson = WorkspaceUtils.getPackageJson();
    const devDependencies = packageJson.devDependencies;
    let modified = false;

    if (devDependencies) {
        eslintDependencies.forEach((nameValuePair) => {
            const [name, value] = nameValuePair;
            if (!devDependencies[name]) {
                devDependencies[name] = value;
                modified = true;
            }
        });
    }

    if (modified) {
        // Save json only if the content was modified.
        WorkspaceUtils.setPackageJson(packageJson);
    }
}

function updateEslintrc() {
    const eslintrcPath = path.join(WorkspaceUtils.LWC_PATH, '.eslintrc.json');

    if (fs.existsSync(eslintrcPath)) {
        const eslintrc = JSON.parse(fs.readFileSync(eslintrcPath, 'utf-8'));
        const eslintrcExtends = eslintrc.extends as Array<string>;

        if (eslintrc && eslintrcExtends) {
            let modified = false;

            if (!eslintrcExtends.includes(eslintRecommended)) {
                eslintrcExtends.push(eslintRecommended);
                modified = true;
            }

            if (!eslintrcExtends.includes(lwcGraphAnalyzerRecommended)) {
                eslintrc.extends.push(lwcGraphAnalyzerRecommended);
                modified = true;
            }

            if (modified) {
                // Save json only if the content was modified.
                fs.writeFileSync(
                    eslintrcPath,
                    JSON.stringify(eslintrc, null, tabSpaces)
                );
            }
        }
    } else {
        // Create eslintrc
        fs.writeFile(
            eslintrcPath,
            `{"extends": ["${eslintRecommended}", "${lwcGraphAnalyzerRecommended}"]}`,
            (err) => {
                if (err) {
                    throw err;
                }
            }
        );
    }
}

export function registerCommand(context: vscode.ExtensionContext) {
    vscode.commands.registerCommand(configureLintingToolsCommand, async () => {
        if (!WorkspaceUtils.lwcFolderExists()) {
            return Promise.reject('LWC folder does not exist.');
        }

        if (!WorkspaceUtils.packageJsonExists()) {
            return Promise.reject('The project does not contain package.json.');
        }

        // Ask user to add eslint plugin
        const result = await vscode.window.showInformationMessage(
            vscode.l10n.t(
                'Do you want to add eslint plugin for LWC data graph anaylsis to your package.json?'
            ),
            { title: vscode.l10n.t('Yes') },
            { title: vscode.l10n.t('No') }
        );

        if (!result || result.title === vscode.l10n.t('No')) {
            return Promise.resolve(false);
        } else {
            try {
                updateDevDependencies();
            } catch (error) {
                return Promise.reject(`Error updating package.json: ${error}`);
            }

            try {
                updateEslintrc();
            } catch (error) {
                return Promise.reject(
                    `Error updating .eslintrc.json: ${error}`
                );
            }

            await vscode.window.showInformationMessage(
                vscode.l10n.t(
                    `Updated developer dependency in package.json. Run package manager such as npmr/yarn/pnpm to update node modules.`
                ),
                { title: vscode.l10n.t('OK') }
            );
            return Promise.resolve();
        }
    });
}