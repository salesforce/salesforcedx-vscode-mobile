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
import { CoreExtensionService } from '../../services/CoreExtensionService';

const commandName =
    'salesforcedx-vscode-offline-app.configure-linting-tools';

enum MetricEvents {
    LWC_FOLDER_DOES_NOT_EXIST = "lwc-folder-does-not-exist",
    PACKAGE_JSON_DOES_NOT_EXIST = "package-json-does-not-exist",
    ERROR_UPDATING_PACKAGE_JSON = "error_updating_package_json",


    
}

const config = workspace.getConfiguration();

class EslintDependencyConfig {
    readonly name: string;
    readonly packageConfigPropertyId: string;
    readonly eslintConfigToExtend: string;

    constructor(
        name: string,
        packageConfigPropertyId: string,
        eslintConfigToExtend: string
    ) {
        this.name = name;
        this.packageConfigPropertyId = packageConfigPropertyId;
        this.eslintConfigToExtend = eslintConfigToExtend;
    }

    getVersion(): string {
        return config.get(this.packageConfigPropertyId) as string;
    }
}

const eslintDependencies: EslintDependencyConfig[] = [
    new EslintDependencyConfig(
        '@salesforce/eslint-plugin-lwc-mobile',
        'mobileOfflineLinting.eslint-plugin-lwc-mobile',
        'plugin:@salesforce/lwc-mobile/recommended'
    ),
    new EslintDependencyConfig(
        '@salesforce/eslint-plugin-lwc-graph-analyzer',
        'mobileOfflineLinting.eslint-plugin-lwc-graph-analyzer',
        'plugin:@salesforce/lwc-graph-analyzer/recommended'
    ),
    new EslintDependencyConfig(
        'eslint',
        'mobileOfflineLinting.eslint',
        'eslint:recommended'
    )
];

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
        const telemetryService = CoreExtensionService.getTelemetryService();
        
        try {
            if (!WorkspaceUtils.lwcFolderExists()) {
                const eventName = `${commandName}.${MetricEvents.LWC_FOLDER_DOES_NOT_EXIST}`;
                const message = l10n.t(eventName);

                await this.showMessage(message);
                telemetryService.sendException(eventName, message);

                return false;
            }

            if (!WorkspaceUtils.packageJsonExists()) {
                const eventName = `${commandName}.${MetricEvents.PACKAGE_JSON_DOES_NOT_EXIST}`;
                const message = l10n.t(eventName);

                await this.showMessage(message);
                telemetryService.sendException(eventName,message);

                return false;
            }

            // Ask user to add eslint plugin
            const result = await this.showMessage(
                l10n.t(`${commandName}.add-linting-guidance`),
                MessageType.InformationYesNo
            );

            if (!result || result.title === l10n.t('No')) {
                return false;
            } else {
                let modifiedDevDependencies = false;
                try {
                    modifiedDevDependencies = this.updateDevDependencies();
                } catch (error) {
                    const eventName = `${commandName}.${MetricEvents.ERROR_UPDATING_PACKAGE_JSON}`;
                    const message = l10n.t(eventName, error as Error)

                    await this.showMessage(message);
                    telemetryService.sendException(eventName,message);
                    
                    return false;
                }

                let modifiedEslintrc = false;
                try {
                    modifiedEslintrc = this.updateEslintrc();
                } catch (error) {
                    const message = l10n.t("extension.commands.salesforcedx-vscode-offline-app.configure-linting-tools.error-updating-eslintrc-json", error as Error);
                    await this.showMessage(message);
                    telemetryService.sendException(
                        commandName + '.error-updating-eslintrc-json',
                        message
                    );
                    return false;
                }

                if (modifiedDevDependencies) {
                    this.showMessage(
                        l10n.t('extension.commands.salesforcedx-vscode-offline-app.configure-linting-tools.updated-package-json'),
                        MessageType.InformationOk
                    );
                }

                if (modifiedEslintrc) {
                    this.showMessage(
                        l10n.t('extension.commands.salesforcedx-vscode-offline-app.configure-linting-tools.updated-eslintrc-json'),
                        MessageType.InformationOk
                    );
                }

                if (modifiedDevDependencies || modifiedEslintrc) {
                    this.showMessage(
                        l10n.t('extension.commands.salesforcedx-vscode-offline-app.configure-linting-tools.run-install-command'),
                        MessageType.InformationOk
                    );
                }

                if (!modifiedDevDependencies && !modifiedEslintrc) {
                    const message = l10n.t('extension.commands.salesforcedx-vscode-offline-app.configure-linting-tools.already-configured');
                    this.showMessage(
                        message,
                        MessageType.InformationOk
                    );
                    // telemetryService.sendCommandEvent(
                    //     commandName + '.success-message',
                    //     message
                    // );
                }

                return true;
            }
        } catch (error) {
            const message = l10n.t('extension.commands.salesforcedx-vscode-offline-app.configure-linting-tools.general-error-message', error as Error);
            await this.showMessage(message);
            telemetryService.sendException(
                commandName + '.general-error-message',
                message
            );
            return false;
        }
    }

    static updateDevDependencies(): boolean {
        const packageJson: PackageJson = WorkspaceUtils.getPackageJson();
        const devDependencies = packageJson.devDependencies;
        let modified = false;

        if (devDependencies) {
            eslintDependencies.forEach((dependencyConfig) => {
                const { name } = dependencyConfig;
                if (!devDependencies[name]) {
                    devDependencies[name] = dependencyConfig.getVersion();
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

            eslintDependencies.forEach((config) => {
                if (!eslintrcExtends.includes(config.eslintConfigToExtend)) {
                    eslintrcExtends.push(config.eslintConfigToExtend);
                    modified = true;
                }
            });

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
                extends: eslintDependencies.map((config) => {
                    return `${config.eslintConfigToExtend}`;
                })
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
    const disposable = commands.registerCommand(
        configureLintingToolsCommand,
        async () => {
            await ConfigureLintingToolsCommand.configure();
        }
    );
    context.subscriptions.push(disposable);
}
