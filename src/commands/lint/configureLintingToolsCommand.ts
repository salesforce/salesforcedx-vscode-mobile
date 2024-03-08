/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { commands, l10n, window, workspace, ExtensionContext } from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceUtils } from '../../utils/workspaceUtils';
import { JSON_INDENTATION_SPACES } from '../../utils/constants';
import * as vscode from 'vscode';

const config = vscode.workspace.getConfiguration();
const eslintPluginLwcGraphAnalyzer =
    '@salesforce/eslint-plugin-lwc-graph-analyzer';
const eslintPluginLwcGraphAnalyzerConfig =
    'mobileOfflineLinting.eslint-plugin-lwc-graph-analyzer';
const eslintPluginLwcGraphAnalyzerVersion = config.get(
    eslintPluginLwcGraphAnalyzerConfig
) as string;

const eslint = 'eslint';
const eslintConfig = 'mobileOfflineLinting.eslint';
const eslintVersion = config.get(eslintConfig) as string;

const configureLintingToolsCommand =
    'salesforcedx-vscode-offline-app.configureLintingTools';
const eslintDependencies = [
    [eslintPluginLwcGraphAnalyzer, eslintPluginLwcGraphAnalyzerVersion],
    [eslint, eslintVersion]
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

export class ConfigureLintingToolsCommand {
    static async configure(): Promise<boolean> {
        try {
            if (!WorkspaceUtils.lwcFolderExists()) {
                await this.showMessage(
                    'The "force-app/main/default/lwc" folder does not exist in your project. This folder is required to create a configuration file for ESLint.'
                );
                return Promise.resolve(false);
            }

            if (!WorkspaceUtils.packageJsonExists()) {
                await this.showMessage(
                    'Your project does not contain a "package.json" specification. You must have a package specification to configure these ESLint packages and their dependencies in your project.'
                );
                return Promise.resolve(false);
            }

            // Ask user to add eslint plugin
            const result = await this.showMessage(
                'Do you want to add the ESLint plugin for LWC graph analysis to your project? This will give you linting feedback on code patterns that will not support your LWCs working offline, for mobile use cases.',
                MessageType.InformationYesNo
            );

            if (!result || result.title === l10n.t('No')) {
                return Promise.resolve(false);
            } else {
                let modifiedDevDependencies = false;
                try {
                    modifiedDevDependencies = this.updateDevDependencies();
                } catch (error) {
                    await this.showMessage(
                        `Error updating package.json: ${error}`
                    );
                    return Promise.resolve(false);
                }

                let modifiedEslintrc = false;
                try {
                    modifiedEslintrc = this.updateEslintrc();
                } catch (error) {
                    await this.showMessage(
                        `Error updating .eslintrc.json: ${error}`
                    );
                    return Promise.resolve(false);
                }

                if (modifiedDevDependencies) {
                    this.showMessage(
                        `Updated package.json to include offline linting packages and dependencies.`,
                        MessageType.InformationOk
                    );
                }

                if (modifiedEslintrc) {
                    this.showMessage(
                        `Updated .eslintrc.json to include recommended linting rules.`,
                        MessageType.InformationOk
                    );
                }

                if (modifiedDevDependencies || modifiedEslintrc) {
                    this.showMessage(
                        `In the Terminal window, be sure to run the install command for your configured package manager, to install the updated dependencies. For example, "npm install" or "yarn install".`,
                        MessageType.InformationOk
                    );
                }

                if (!modifiedDevDependencies && !modifiedEslintrc) {
                    this.showMessage(
                        `All offline linting packages and dependencies are already configured in your project. No update has been made to package.json.`,
                        MessageType.InformationOk
                    );
                }

                return Promise.resolve(true);
            }
        } catch (error) {
            await this.showMessage(
                `There was an error trying to update either the offline linting dependencies or linting configuration: ${error}`
            );
            return Promise.resolve(false);
        }
    }

    static updateDevDependencies(): boolean {
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

    static updateEslintrc(): boolean {
        const eslintrcPath = path.join(
            WorkspaceUtils.getWorkspaceDir(),
            WorkspaceUtils.LWC_PATH,
            '.eslintrc.json'
        );

        if (fs.existsSync(eslintrcPath)) {
            const eslintrc = JSON.parse(fs.readFileSync(eslintrcPath, 'utf-8'));

            if (!eslintrc.extends) {
                eslintrc.extends = [];
            }

            const eslintrcExtends = eslintrc.extends as Array<string>;

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
                    JSON.stringify(eslintrc, null, JSON_INDENTATION_SPACES)
                );
            }

            return modified;
        } else {
            // Create eslintrc
            const eslintrc = {
                extends: [
                    `${eslintRecommended}`,
                    `${lwcGraphAnalyzerRecommended}`
                ]
            };
            const jsonString = JSON.stringify(
                eslintrc,
                null,
                JSON_INDENTATION_SPACES
            );

            fs.writeFileSync(eslintrcPath, jsonString);

            return true;
        }
    }

    static async showMessage(
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
                return await window.showInformationMessage(localizedMessage, {
                    title: l10n.t('OK')
                });
        }
    }
}

export function registerCommand(context: ExtensionContext) {
    commands.registerCommand(configureLintingToolsCommand, async () => {
        await ConfigureLintingToolsCommand.configure();
    });
}
