/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Uri, l10n } from 'vscode';
import { ProgressLocation, window, workspace } from 'vscode';
import * as path from 'path';
import { access, copyFile } from 'fs/promises';
import { InstructionsWebviewProvider } from '../../webviews/instructions';
import { UIUtils } from '../../utils/uiUtils';

export type LandingPageStatus = {
    exists: boolean;
    warning?: string;
};

export type LandingPageType =
    | 'existing'
    | 'default'
    | 'caseManagement'
    | 'healthcare'
    | 'retail';

export type LandingPageCollectionStatus = {
    error?: string;
    landingPageCollection: {
        [landingPageType in LandingPageType]?: LandingPageStatus;
    };
};

/**
 * This command will prompt the user to select one of the canned landing page templates, and will simply copy it to "landing_page.json".
 * When the project is deployed to the user's org, this file will also be copied into static resources and picked up by SApp+.
 */
export class TemplateChooserCommand {
    static readonly LANDING_PAGE_FILENAME_PREFIX = 'landing_page';
    static readonly LANDING_PAGE_JSON_FILE_EXTENSION = '.json';
    static readonly LANDING_PAGE_METADATA_FILE_EXTENSION = '.resource-meta.xml';
    static readonly LANDING_PAGE_FILENAME_PREFIXES: {
        [landingPageType in LandingPageType]: string;
    } = {
        existing: this.LANDING_PAGE_FILENAME_PREFIX,
        default: `${this.LANDING_PAGE_FILENAME_PREFIX}_default`,
        caseManagement: `${this.LANDING_PAGE_FILENAME_PREFIX}_case_management`,
        healthcare: `${this.LANDING_PAGE_FILENAME_PREFIX}_healthcare`,
        retail: `${this.LANDING_PAGE_FILENAME_PREFIX}_retail_execution`
    };

    public static async chooseTemplate(extensionUri: Uri) {
        return new Promise<void>((resolve) => {
            new InstructionsWebviewProvider(
                extensionUri
            ).showInstructionWebview(
                l10n.t('Offline Starter Kit: Select Landing Page'),
                'resources/instructions/landingPageTemplateChoice.html',
                [
                    {
                        type: 'landingPageChosen',
                        action: async (panel, data) => {
                            const landingPageChosenData = data as {
                                landingPageType: LandingPageType;
                            };
                            const completed = await this.onLandingPageChosen(
                                landingPageChosenData
                            );
                            if (completed) {
                                panel.dispose();
                                return resolve();
                            }
                        }
                    },
                    {
                        type: 'landingPageStatus',
                        action: async (_panel, _data, callback) => {
                            if (callback) {
                                const landingPageStatus =
                                    await this.getLandingPageStatus();
                                callback(landingPageStatus);
                            }
                        }
                    }
                ]
            );
        });
    }

    /**
     * This will copy the chosen template files to landing_page.json and
     * landing_page.resource-meta.xml in the staticresources folder of the project.
     * @param choiceData The data object containing the landing page type the user
     * selected.
     */
    static async onLandingPageChosen(choiceData: {
        landingPageType: LandingPageType;
    }): Promise<boolean> {
        return new Promise<boolean>(async (resolve) => {
            const landingPageType = choiceData.landingPageType;

            // Nothing to do if the user chose to keep their existing landing page.
            if (landingPageType === 'existing') {
                return resolve(true);
            }

            // If a landing page exists, warn about overwriting it.
            const staticResourcesPath = await UIUtils.getStaticResourcesDir();
            const existingLandingPageFiles = await this.landingPageFilesExist(
                staticResourcesPath,
                'existing'
            );
            if (
                existingLandingPageFiles.jsonFileExists ||
                existingLandingPageFiles.metaFileExists
            ) {
                const confirmOverwrite =
                    await this.askUserToOverwriteLandingPage();
                if (confirmOverwrite === l10n.t('No')) {
                    console.info(
                        'User chose not to overwrite their existing landing page.'
                    );
                    return resolve(false);
                }
            }

            // Copy both the json and metadata files.
            const sourceFilenamePrefix =
                this.LANDING_PAGE_FILENAME_PREFIXES[landingPageType];
            const destFilenamePrefix =
                this.LANDING_PAGE_FILENAME_PREFIXES.existing;
            for (const fileExtension of [
                this.LANDING_PAGE_JSON_FILE_EXTENSION,
                this.LANDING_PAGE_METADATA_FILE_EXTENSION
            ]) {
                const sourceFilename = sourceFilenamePrefix + fileExtension;
                const destFilename = destFilenamePrefix + fileExtension;
                const sourcePath = path.join(
                    staticResourcesPath,
                    sourceFilename
                );
                const destinationPath = path.join(
                    staticResourcesPath,
                    destFilename
                );

                await window.withProgress(
                    {
                        location: ProgressLocation.Notification,
                        title: l10n.t(
                            "Copying '{0}' to '{1}'",
                            sourceFilename,
                            destFilename
                        )
                    },
                    async (_progress, _token) => {
                        await copyFile(sourcePath, destinationPath);
                    }
                );
            }
            return resolve(true);
        });
    }

    static askUserToOverwriteLandingPage(): Thenable<string | undefined> {
        return window.showWarningMessage(
            l10n.t(
                'Are you sure you want to overwrite your existing landing page?'
            ),
            { modal: true },
            l10n.t('Yes'),
            l10n.t('No')
        );
    }

    static async getLandingPageStatus(): Promise<LandingPageCollectionStatus> {
        return new Promise<LandingPageCollectionStatus>(async (resolve) => {
            const landingPageCollectionStatus: LandingPageCollectionStatus = {
                landingPageCollection: {}
            };

            let staticResourcesPath: string;
            try {
                staticResourcesPath = await UIUtils.getStaticResourcesDir();
            } catch (err) {
                landingPageCollectionStatus.error = (err as Error).message;
                return resolve(landingPageCollectionStatus);
            }

            for (const lptIndex in this.LANDING_PAGE_FILENAME_PREFIXES) {
                const landingPageType = lptIndex as LandingPageType;
                const landingPageFilesExist = await this.landingPageFilesExist(
                    staticResourcesPath,
                    landingPageType
                );
                const landingPageExists =
                    landingPageFilesExist.jsonFileExists &&
                    landingPageFilesExist.metaFileExists;
                let warningMessage: string | undefined;
                if (
                    !landingPageFilesExist.jsonFileExists &&
                    !landingPageFilesExist.metaFileExists
                ) {
                    warningMessage = l10n.t(
                        "The landing page files '{0}{1}' and '{0}{2}' do not exist.",
                        this.LANDING_PAGE_FILENAME_PREFIXES[landingPageType],
                        this.LANDING_PAGE_JSON_FILE_EXTENSION,
                        this.LANDING_PAGE_METADATA_FILE_EXTENSION
                    );
                } else if (!landingPageFilesExist.metaFileExists) {
                    warningMessage = l10n.t(
                        "The landing page file '{0}{1}' does not exist",
                        this.LANDING_PAGE_FILENAME_PREFIXES[landingPageType],
                        this.LANDING_PAGE_METADATA_FILE_EXTENSION
                    );
                } else if (!landingPageFilesExist.jsonFileExists) {
                    warningMessage = l10n.t(
                        "The landing page file '{0}{1}' does not exist",
                        this.LANDING_PAGE_FILENAME_PREFIXES[landingPageType],
                        this.LANDING_PAGE_JSON_FILE_EXTENSION
                    );
                }
                landingPageCollectionStatus.landingPageCollection[
                    landingPageType
                ] = { exists: landingPageExists, warning: warningMessage };
            }
            return resolve(landingPageCollectionStatus);
        });
    }

    static getWorkspaceDir(): string {
        const workspaceFolders = workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new NoWorkspaceError(
                'No workspace defined for this project.'
            );
        }
        return workspaceFolders[0].uri.fsPath;
    }

    static async landingPageFilesExist(
        staticResourcesPath: string,
        landingPageType: LandingPageType
    ): Promise<{ jsonFileExists: boolean; metaFileExists: boolean }> {
        return new Promise<{
            jsonFileExists: boolean;
            metaFileExists: boolean;
        }>(async (resolve) => {
            let jsonFileExists = true;
            const jsonFilename =
                this.LANDING_PAGE_FILENAME_PREFIXES[landingPageType] +
                this.LANDING_PAGE_JSON_FILE_EXTENSION;
            const jsonFilePath = path.join(staticResourcesPath, jsonFilename);
            try {
                await access(jsonFilePath);
            } catch (err) {
                console.warn(
                    `File '${jsonFilename}' does not exist at '${staticResourcesPath}'.`
                );
                jsonFileExists = false;
            }
            let metaFileExists = true;
            const metaFilename =
                this.LANDING_PAGE_FILENAME_PREFIXES[landingPageType] +
                this.LANDING_PAGE_METADATA_FILE_EXTENSION;
            const metaFilePath = path.join(staticResourcesPath, metaFilename);
            try {
                await access(metaFilePath);
            } catch (err) {
                console.warn(
                    `File '${metaFilename}' does not exist at '${staticResourcesPath}'.`
                );
                metaFileExists = false;
            }

            return resolve({ jsonFileExists, metaFileExists });
        });
    }
}

export class NoWorkspaceError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = this.constructor.name;
        Object.setPrototypeOf(this, NoWorkspaceError.prototype);
    }
}

export class NoStaticResourcesDirError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = this.constructor.name;
        Object.setPrototypeOf(this, NoStaticResourcesDirError.prototype);
    }
}
