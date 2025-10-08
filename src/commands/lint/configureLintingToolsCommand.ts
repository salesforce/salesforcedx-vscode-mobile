/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { commands, l10n, window, workspace, ExtensionContext } from 'vscode';
import { WorkspaceUtils } from '../../utils/workspaceUtils';
import {
    ESLINT_CONFIG_FILE,
    ESLINT_CONFIG_FILE_CONTENT_WITH_USER_CONFIG,
    ESLINT_CONFIG_FILE_CONTENT_WITHOUT_USER_CONFIG,
    ESLINT_CONFIG_MOBILE_FILE,
    ESLINT_CONFIG_MOBILE_FILE_CONTENT,
    ESLINT_CONFIG_USER_FILE
} from '../../utils/constants';
import { CoreExtensionService } from '../../services/CoreExtensionService';
import { TelemetryService } from '../../types';

const commandName = 'salesforcedx-vscode-offline-app.configure-linting-tools';

enum MetricEvents {
    CONFIGURE_LINTING_TOOLS_COMMAND_STARTED = 'configure-linting-tools-command-started',
    UPDATED_PACKAGE_JSON = 'updated-package-json',
    UPDATED_ESLINT_CONFIGURATION = 'updated-eslintrc-config-js',
    ALREADY_CONFIGURED = 'already-configured',
    LWC_FOLDER_DOES_NOT_EXIST = 'lwc-folder-does-not-exist',
    PACKAGE_JSON_DOES_NOT_EXIST = 'package-json-does-not-exist',
    ERROR_UPDATING_PACKAGE_JSON = 'error-updating-package-json',
    ERROR_UPDATING_ESLINT_CONFIGURATION = 'error-updating-eslint-config-js',
    LEGACY_ESLINT_CONFIG_FILE = 'legacy-eslint-config-file',
    GENERAL_ERROR = 'general-error'
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

        // Send marker to record that the command got executed.
        telemetryService.sendCommandEvent(commandName, process.hrtime(), {
            metricEvents: MetricEvents.CONFIGURE_LINTING_TOOLS_COMMAND_STARTED
        });

        try {
            // Do pre-conditions checks
            const checkPassed =
                await ConfigureLintingToolsCommand.doPreConditionsCheck(
                    telemetryService
                );
            if (!checkPassed) {
                return false;
            }

            // Ask user to add eslint plugin
            const result = await this.showMessage(
                'Do you want to add Salesforce code linting guidance for Mobile and Offline capabilities? These tools will identify code patterns that cause problems in Mobile and Offline use cases.',
                MessageType.InformationYesNo
            );
            if (!result || result.title === l10n.t('No')) {
                return false;
            }

            // Update dev dependencies
            let modifiedDevDependencies = false;
            try {
                modifiedDevDependencies = this.updateDevDependencies();
            } catch (error) {
                const event = `${commandName}.${MetricEvents.ERROR_UPDATING_PACKAGE_JSON}`;
                const message = `Error updating package.json: ${error}`;

                await this.showMessage(message);
                telemetryService.sendException(event, message);

                return false;
            }

            // Update eslint configuration files
            let modifiedEslintConfig = false;
            try {
                const hasEslintConfigFile =
                    WorkspaceUtils.eslintConfigurationExists(
                        ESLINT_CONFIG_FILE
                    );
                const hasEslintConfigUserMobileFile =
                    WorkspaceUtils.eslintConfigurationExists(
                        ESLINT_CONFIG_MOBILE_FILE
                    );

                if (!hasEslintConfigFile) {
                    modifiedEslintConfig = this.initializeEslintConfiguration();
                } else if (!hasEslintConfigUserMobileFile) {
                    modifiedEslintConfig = this.convertEslintConfiguration();
                } else {
                    modifiedEslintConfig =
                        this.updateMobileEslintConfiguration();
                }
            } catch (error) {
                const event = `${commandName}.${MetricEvents.ERROR_UPDATING_ESLINT_CONFIGURATION}`;
                const message = `Error updating .elint.config.js: ${error}`;

                await this.showMessage(message);
                telemetryService.sendException(event, message);

                return false;
            }

            if (modifiedDevDependencies) {
                telemetryService.sendCommandEvent(
                    commandName,
                    process.hrtime(),
                    { metricEvents: MetricEvents.UPDATED_PACKAGE_JSON }
                );
                this.showMessage(
                    `Updated package.json to include offline linting packages and dependencies.`,
                    MessageType.InformationOk
                );
            }

            if (modifiedEslintConfig) {
                telemetryService.sendCommandEvent(
                    commandName,
                    process.hrtime(),
                    { metricEvents: MetricEvents.UPDATED_ESLINT_CONFIGURATION }
                );
                this.showMessage(
                    `Updated eslint.config.js to include recommended linting rules.`,
                    MessageType.InformationOk
                );
            }

            if (modifiedDevDependencies || modifiedEslintConfig) {
                this.showMessage(
                    `In the Terminal window, be sure to run the install command for your configured package manager, to install the updated dependencies. For example, "npm install" or "yarn install".`,
                    MessageType.InformationOk
                );
            }

            if (!modifiedDevDependencies && !modifiedEslintConfig) {
                telemetryService.sendCommandEvent(
                    commandName,
                    process.hrtime(),
                    { metricEvents: MetricEvents.ALREADY_CONFIGURED }
                );
                this.showMessage(
                    `All offline linting packages and dependencies are already configured in your project. No update has been made to package.json.`,
                    MessageType.InformationOk
                );
            }

            return true;
        } catch (error) {
            const event = `${commandName}.${MetricEvents.GENERAL_ERROR}`;
            const message = `There was an error trying to update either the offline linting dependencies or linting configuration: ${error}`;

            await this.showMessage(message);
            telemetryService.sendException(event, message);

            return false;
        }
    }

    /**
     * Do
     * @param telemetryService
     * @returns
     */
    private static async doPreConditionsCheck(
        telemetryService: TelemetryService
    ): Promise<boolean> {
        if (!WorkspaceUtils.lwcFolderExists()) {
            const event = `${commandName}.${MetricEvents.LWC_FOLDER_DOES_NOT_EXIST}`;
            const message =
                'The "force-app/main/default/lwc" folder does not exist in your project. This folder is required to create a configuration file for ESLint.';

            await this.showMessage(message);
            telemetryService.sendException(event, message);

            return false;
        }

        if (!WorkspaceUtils.packageJsonExists()) {
            const event = `${commandName}.${MetricEvents.PACKAGE_JSON_DOES_NOT_EXIST}`;
            const message =
                'Your project does not contain a "package.json" specification. You must have a package specification to configure these ESLint packages and their dependencies in your project.';

            await this.showMessage(message);
            telemetryService.sendException(event, message);

            return false;
        }

        if (WorkspaceUtils.legacyEslintConfigurationExists()) {
            const event = `${commandName}.${MetricEvents.LEGACY_ESLINT_CONFIG_FILE}`;
            const message =
                'Your ESLint configuration is outdated. Please update your legacy .eslintrc.json file to the new flat config format and then retry the command.';

            await this.showMessage(message);
            telemetryService.sendException(event, message);

            return false;
        }

        return true;
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

    /**
     * Current project doesn't have eslint.config.js file. Create eslint.config.js and eslint.config.mobile.js files.
     * @returns
     */
    static initializeEslintConfiguration(): boolean {
        WorkspaceUtils.writeEslintConfiguration(
            ESLINT_CONFIG_FILE,
            ESLINT_CONFIG_FILE_CONTENT_WITHOUT_USER_CONFIG
        );
        WorkspaceUtils.writeEslintConfiguration(
            ESLINT_CONFIG_MOBILE_FILE,
            ESLINT_CONFIG_MOBILE_FILE_CONTENT
        );
        return true;
    }

    /**
     * Current project has eslint.config.js file but not eslint.config.mobile.js file. So mobile eslint needs be configured with existing eslint configuration.
     * Do following steps:
     * 1. copy eslint.config.js to eslint.config.use.js,
     * 2. create eslint.config.mobile.js
     * 3. create eslint.config.js to reference the user
     * @returns boolean
     */
    static convertEslintConfiguration(): boolean {
        const eslintConfiguration =
            WorkspaceUtils.readEslintConfiguration(ESLINT_CONFIG_FILE);
        WorkspaceUtils.writeEslintConfiguration(
            ESLINT_CONFIG_USER_FILE,
            eslintConfiguration
        );
        WorkspaceUtils.writeEslintConfiguration(
            ESLINT_CONFIG_MOBILE_FILE,
            ESLINT_CONFIG_MOBILE_FILE_CONTENT
        );
        WorkspaceUtils.writeEslintConfiguration(
            ESLINT_CONFIG_FILE,
            ESLINT_CONFIG_FILE_CONTENT_WITH_USER_CONFIG
        );
        return true;
    }

    /**
     * Current project has eslint.config.js file and eslint.config.mobile.js file.
     * Only need to reflush eslint.config.mobile.js with default content
     * @returns boolean
     */
    static updateMobileEslintConfiguration(): boolean {
        WorkspaceUtils.writeEslintConfiguration(
            ESLINT_CONFIG_MOBILE_FILE,
            ESLINT_CONFIG_MOBILE_FILE_CONTENT
        );
        return true;
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
    const disposable = commands.registerCommand(commandName, async () => {
        await ConfigureLintingToolsCommand.configure();
    });
    context.subscriptions.push(disposable);
}
