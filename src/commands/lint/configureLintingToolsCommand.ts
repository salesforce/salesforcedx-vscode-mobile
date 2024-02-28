/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { commands, l10n, window, ExtensionContext } from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceUtils } from '../../utils/workspaceUtils';
import { TAB_SPACES } from '../../utils/constants';

const configureLintingToolsCommand =
    'salesforcedx-vscode-offline-app.configureLintingTools';
const eslintDependencies = [
    ['@salesforce/eslint-plugin-lwc-graph-analyzer', '^0.9.0'],
    ['eslint', '^8.47.0']
];
const lwcGraphAnalyzerRecommended: string =
    'plugin:@salesforce/lwc-graph-analyzer/recommended';
const eslintRecommended = 'eslint:recommended';

interface PackageJson {
    devDependencies?: Record<string, string>;
}

enum MessageType {
    Error,
    InformationYesNo,
    InformationOk
}

export function onActivate(context: ExtensionContext) {
    commands.executeCommand(
        'setContext',
        'sfdx_project_opened',
        WorkspaceUtils.isSfdxProjectOpened()
    );
}

function updateDevDependencies(): boolean {
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

    return modified;
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
                    JSON.stringify(eslintrc, null, TAB_SPACES)
                );
            }
        }
    } else {
        // Create eslintrc
        fs.writeFileSync(
            eslintrcPath,
            `{"extends": ["${eslintRecommended}", "${lwcGraphAnalyzerRecommended}"]}`
        );
    }
}

async function showMessage(
    message: string,
    messageType: MessageType = MessageType.Error
): Promise<{ title: string } | undefined> {
    const localizedMessage = l10n.t(message);
    switch (messageType) {
        case MessageType.Error:
            return await window.showErrorMessage(localizedMessage, {
                title: l10n.t('OK')
            });
        case MessageType.InformationYesNo:
            return await window.showInformationMessage(
                localizedMessage,
                { title: l10n.t('Yes') },
                { title: l10n.t('No') }
            );
        case MessageType.InformationOk:
            return await await window.showInformationMessage(localizedMessage, {
                title: l10n.t('OK')
            });
    }
}

export class ConfigureLintingToolsCommand {
    static async configure(): Promise<boolean> {
        try {
            if (!WorkspaceUtils.lwcFolderExists()) {
                await showMessage('LWC folder does not exist.');
                return Promise.resolve(false);
            }

            if (!WorkspaceUtils.packageJsonExists()) {
                await showMessage('The project does not contain package.json.');
                return Promise.resolve(false);
            }

            // Ask user to add eslint plugin
            const result = await showMessage(
                'Do you want to add eslint plugin for LWC data graph anaylsis to your package.json?',
                MessageType.InformationYesNo
            );

            if (!result || result.title === l10n.t('No')) {
                return Promise.resolve(false);
            } else {
                let modified = false;

                try {
                    modified = updateDevDependencies();
                } catch (error) {
                    await showMessage(`Error updating package.json: ${error}`);
                    return Promise.resolve(false);
                }

                try {
                    updateEslintrc();
                } catch (error) {
                    await showMessage(
                        `Error updating .eslintrc.json: ${error}`
                    );
                    return Promise.resolve(false);
                }

                if (modified) {
                    await showMessage(
                        `Updated developer dependency in package.json. Run package manager such as npmr/yarn/pnpm to update node modules.`,
                        MessageType.InformationOk
                    );
                } else {
                    await showMessage(
                        `No update was made in package.json. It already includes eslint plugin for LWC data graph analysis.`,
                        MessageType.InformationOk
                    );
                }

                return Promise.resolve(true);
            }
        } catch (error) {
            await showMessage(
                `There was an error trying to update developer dependency in package.json: ${error}`
            );
            return Promise.resolve(false);
        }
    }
}

export function registerCommand(context: ExtensionContext) {
    commands.registerCommand(configureLintingToolsCommand, async () => {
        await ConfigureLintingToolsCommand.configure();
    });
}
