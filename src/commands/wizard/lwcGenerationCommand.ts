/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Uri, l10n } from 'vscode';
import { access } from 'fs/promises';
import { InstructionsWebviewProvider } from '../../webviews/instructions';
import { UEMParser } from '../../utils/uemParser';
import { WorkspaceUtils } from '../../utils/workspaceUtils';
import { CommonUtils } from '../../utils/commonUtils';
import { OrgUtils } from '../../utils/orgUtils';
import * as fs from 'fs';
import { CodeBuilder } from '../../utils/codeBuilder';
import * as path from 'path';

export type QuickActionStatus = {
    view: boolean;
    edit: boolean;
    create: boolean;
};

export type SObjectQuickActionStatus = {
    sobjects: {
        [name: string]: QuickActionStatus;
    };
};

export type GetSObjectsStatus = {
    sobjects: string[];
};

export class LwcGenerationCommand {
    static async createSObjectLwcQuickActions(extensionUri: Uri) {
        return new Promise<void>((resolve) => {
            new InstructionsWebviewProvider(
                extensionUri
            ).showInstructionWebview(
                l10n.t('Offline Starter Kit: Create sObject LWC Quick Actions'),
                'resources/instructions/createSObjectLwcQuickActions.html',
                [
                    {
                        type: 'continueButton',
                        action: (panel) => {
                            panel.dispose();
                            return resolve();
                        }
                    },
                    {
                        type: 'generateLwcQuickActions',
                        action: async (_panel, _data, callback) => {
                            const quickActionStatus =
                                await LwcGenerationCommand.checkForExistingQuickActions().catch(
                                    (error) => {
                                        if (callback) {
                                            callback({ error: error });
                                        }
                                        return;
                                    }
                                );

                            const newLwcQuickActionStatus =
                                await LwcGenerationCommand.generateMissingLwcsAndQuickActions(
                                    extensionUri,
                                    quickActionStatus!
                                ).catch((error) => {
                                    if (callback) {
                                        callback({ error: error });
                                    }
                                    return;
                                });

                            // send back updates so UI can be refreshed
                            if (callback) {
                                callback(newLwcQuickActionStatus!);
                            }
                        }
                    },
                    {
                        type: 'getQuickActionStatus',
                        action: async (_panel, _data, callback) => {
                            if (callback) {
                                const quickActionStatus =
                                    await LwcGenerationCommand.checkForExistingQuickActions().catch(
                                        (error) => {
                                            callback({ error: error });
                                            return;
                                        }
                                    );
                                callback(quickActionStatus!);
                            }
                        }
                    }
                ]
            );
        });
    }

    static async getSObjectsFromLandingPage(): Promise<GetSObjectsStatus> {
        return new Promise<GetSObjectsStatus>(async (resolve, reject) => {
            const staticResourcesPath =
                await WorkspaceUtils.getStaticResourcesDir();
            const landingPageJson = 'landing_page.json';
            const landingPagePath = path.join(
                staticResourcesPath,
                landingPageJson
            );

            const getSObjectsStatus: GetSObjectsStatus = {
                sobjects: []
            };

            try {
                await access(landingPagePath);
                const uem = CommonUtils.loadJsonFromFile(landingPagePath);
                getSObjectsStatus.sobjects = UEMParser.findSObjects(uem as any);
                resolve(getSObjectsStatus);
            } catch (err) {
                console.warn(
                    `File '${landingPageJson}' does not exist at '${staticResourcesPath}'.`
                );
                reject((err as Error).message);
            }
        });
    }

    static async checkForExistingQuickActions(): Promise<SObjectQuickActionStatus> {
        return new Promise<SObjectQuickActionStatus>(
            async (resolve, reject) => {
                const results: SObjectQuickActionStatus = { sobjects: {} };

                const sObjectsStatus =
                    await this.getSObjectsFromLandingPage().catch((error) => {
                        return reject(error);
                    });

                sObjectsStatus!.sobjects.forEach((sobject) => {
                    const quickActionStatus: QuickActionStatus = {
                        view: false,
                        edit: false,
                        create: false
                    };
                    quickActionStatus.view =
                        LwcGenerationCommand.checkForExistingQuickAction(
                            sobject,
                            'view'
                        );
                    quickActionStatus.edit =
                        LwcGenerationCommand.checkForExistingQuickAction(
                            sobject,
                            'edit'
                        );
                    quickActionStatus.create =
                        LwcGenerationCommand.checkForExistingQuickAction(
                            sobject,
                            'create'
                        );

                    results.sobjects[sobject] = quickActionStatus;
                });

                return resolve(results);
            }
        );
    }

    static async generateMissingLwcsAndQuickActions(
        extensionUri: Uri,
        quickActionStatus: SObjectQuickActionStatus
    ): Promise<SObjectQuickActionStatus> {
        return new Promise<SObjectQuickActionStatus>(
            async (resolve, reject) => {
                for (const sobject in quickActionStatus.sobjects) {
                    try {
                        const quickActions =
                            quickActionStatus.sobjects[sobject];

                        if (
                            !quickActions.create ||
                            !quickActions.edit ||
                            !quickActions.view
                        ) {
                            // at least 1 needs to be created
                            const compactLayoutFields =
                                await OrgUtils.getCompactLayoutFieldsForSObject(
                                    sobject
                                ).catch((err) => {
                                    reject(
                                        `An error occurred while obtaining layout for ${sobject} : ${
                                            (err as Error).message
                                        }`
                                    );
                                    return;
                                });

                            const codeBuilder = new CodeBuilder(
                                extensionUri,
                                sobject,
                                compactLayoutFields!
                            );

                            if (!quickActions.view) {
                                await codeBuilder.generateView();
                            }

                            if (!quickActions.edit) {
                                await codeBuilder.generateEdit();
                            }

                            if (!quickActions.create) {
                                await codeBuilder.generateCreate();
                            }
                        }
                    } catch (err) {
                        console.error(
                            `Could not generate quick actions for sobject ${sobject}, so skipping`,
                            err
                        );
                    }
                }

                // Just double check now that things have been created.
                const newStatus =
                    await LwcGenerationCommand.checkForExistingQuickActions();
                resolve(newStatus);
            }
        );
    }

    private static checkForExistingQuickAction(
        sobject: string,
        qaName: string
    ): boolean {
        const expectedMetadataFilename = `${sobject}.${qaName}.quickAction-meta.xml`;
        try {
            // Check if the qa directory exists
            const stats = fs.statSync(
                `force-app/main/default/quickActions/${expectedMetadataFilename}`
            );
            return stats.isFile();
        } catch (error) {
            // If an error occurs, the directory does not exist
            return false;
        }
    }
}
