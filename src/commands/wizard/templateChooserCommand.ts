/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { QuickPickItem, Uri, l10n } from 'vscode';
import { UIUtils } from '../../utils/uiUtils';
import { workspace } from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { access } from 'fs/promises';
import { InstructionsWebviewProvider } from '../../webviews/instructions';

export interface TemplateQuickPickItem extends QuickPickItem {
    filenamePrefix: string;
}

export type LandingPageStatus = {
    exists: boolean;
    warning?: string;
};

export type LandingPageCollectionStatus = {
    error?: string;
    landingPageCollection: { [landingPageType: string]: LandingPageStatus };
};

/**
 * This command will prompt the user to select one of the canned landing page templates, and will simply copy it to "landing_page.json".
 * When the project is deployed to the user's org, this file will also be copied into static resources and picked up by SApp+.
 */
export class TemplateChooserCommand {
    static readonly STATIC_RESOURCES_PATH = path.join(
        'force-app',
        'main',
        'default',
        'staticresources'
    );
    static readonly LANDING_PAGE_FILENAME_PREFIX = 'landing_page';
    static readonly LANDING_PAGE_JSON_FILE_EXTENSION = '.json';
    static readonly LANDING_PAGE_METADATA_FILE_EXTENSION = '.resource-meta.xml';
    static readonly LANDING_PAGE_FILENAME_PREFIXES: {
        [landingPageType: string]: string;
    } = {
        existing: this.LANDING_PAGE_FILENAME_PREFIX,
        default: `${this.LANDING_PAGE_FILENAME_PREFIX}_default`,
        caseManagement: `${this.LANDING_PAGE_FILENAME_PREFIX}_case_management`,
        healthcare: `${this.LANDING_PAGE_FILENAME_PREFIX}_healthcare`,
        retail: `${this.LANDING_PAGE_FILENAME_PREFIX}_retail_execution`
    };

    static readonly TEMPLATE_LIST_ITEMS: TemplateQuickPickItem[] = [
        {
            label: l10n.t('Default'),
            detail: l10n.t(
                'Recently viewed Contacts, Accounts, and Opportunities.'
            ),
            filenamePrefix: 'landing_page_default'
        },
        {
            label: l10n.t('Case Management'),
            detail: l10n.t(
                'New Case action and the 5 most recent Cases, Accounts, and Contacts.'
            ),
            filenamePrefix: 'landing_page_case_management'
        },
        {
            label: l10n.t('Healthcare'),
            detail: l10n.t(
                'Global quick actions with BarcodeScanner, new Visitor, and more.'
            ),
            filenamePrefix: 'landing_page_healthcare'
        },
        {
            label: l10n.t('Retail Execution'),
            detail: l10n.t(
                'Global quick actions with new Opportunity, new Lead, and more.'
            ),
            filenamePrefix: 'landing_page_retail_execution'
        }
    ];

    public static async chooseTemplate(extensionUri: Uri) {
        return new Promise<void>((resolve) => {
            new InstructionsWebviewProvider(
                extensionUri
            ).showInstructionWebview(
                l10n.t('Offline Starter Kit: Select Landing Page'),
                'resources/instructions/landingPageTemplateChoice.html',
                [
                    {
                        type: 'chooseTemplateButton',
                        action: (panel) => {
                            panel.dispose();
                            return resolve();
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

    public static async copyDefaultTemplate(extensionUri: Uri) {
        await TemplateChooserCommand.copySelectedFiles(
            TemplateChooserCommand.TEMPLATE_LIST_ITEMS[0].filenamePrefix
        );

        await InstructionsWebviewProvider.showDismissableInstructions(
            extensionUri,
            l10n.t('Landing Page Customization'),
            'resources/instructions/landingpage.html'
        );
    }

    /**
     * This will copy the given template files over to the staticresources/landing_page.* locations, including
     * the .json and .resource-meta.xml file.
     * @param fileNamePrefix filename prefix of the template file to copy.
     */
    static async copySelectedFiles(fileNamePrefix: string): Promise<boolean> {
        const workspaceFolders = workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const rootPath = workspaceFolders[0].uri.fsPath;

            // copy both the json and metadata files.
            for (const fileExtension of [
                this.LANDING_PAGE_JSON_FILE_EXTENSION,
                this.LANDING_PAGE_METADATA_FILE_EXTENSION
            ]) {
                const fileName = `${fileNamePrefix}${fileExtension}`;
                const destinationFileName = `${this.LANDING_PAGE_FILENAME_PREFIX}${fileExtension}`;
                console.log(`Copying ${fileName} to ${destinationFileName}`);

                const sourcePath = path.join(
                    rootPath,
                    TemplateChooserCommand.STATIC_RESOURCES_PATH,
                    fileName
                );
                const destinationPath = path.join(
                    rootPath,
                    TemplateChooserCommand.STATIC_RESOURCES_PATH,
                    destinationFileName
                );

                fs.copyFileSync(sourcePath, destinationPath);
            }
            return Promise.resolve(true);
        }
        return Promise.reject('Could not determine workspace folder.');
    }

    static async getLandingPageStatus(): Promise<LandingPageCollectionStatus> {
        return new Promise<LandingPageCollectionStatus>(async (resolve) => {
            const landingPageCollectionStatus: LandingPageCollectionStatus = {
                landingPageCollection: {}
            };
            const workspaceFolders = workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                landingPageCollectionStatus.error =
                    'No workspace defined for this project.';
                return resolve(landingPageCollectionStatus);
            }
            const projectPath = workspaceFolders[0].uri.fsPath;
            const staticResourcesPath = path.join(
                projectPath,
                this.STATIC_RESOURCES_PATH
            );
            try {
                await access(staticResourcesPath);
            } catch (err) {
                landingPageCollectionStatus.error = `Could not read landing page directory at '${staticResourcesPath}': ${err}`;
                return resolve(landingPageCollectionStatus);
            }

            for (const landingPageType of Object.keys(
                this.LANDING_PAGE_FILENAME_PREFIXES
            )) {
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

    static async landingPageFilesExist(
        staticResourcesPath: string,
        landingPageType: string
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
