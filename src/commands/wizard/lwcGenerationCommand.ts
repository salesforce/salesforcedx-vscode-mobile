import { Uri, l10n } from 'vscode';
import { InstructionsWebviewProvider } from '../../webviews/instructions';
import { TemplateChooserCommand } from './templateChooserCommand';
import { access } from 'fs/promises';
import { UEMParser } from '../../utils/uemParser';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core';
import * as fs from 'fs';
import * as path from 'path';

export type QuickActionStatus = {
    view: boolean;
    edit: boolean;
    create: boolean;
};

export type SObjectQuickActionStatus = {
    error?: string;
    sobjects: {
        [name: string]: QuickActionStatus;
    };
};

export type GetSObjectsStatus = {
    error?: string;
    sobjects: string[];
};

export class LwcGenerationCommand {
    extensionUri: Uri;

    constructor(extensionUri: Uri) {
        this.extensionUri = extensionUri;
    }

    static async getSObjectsFromLandingPage(): Promise<GetSObjectsStatus> {
        return new Promise<GetSObjectsStatus>(async (resolve) => {
            let landingPageExists = true;

            const staticResourcesPath =
                await TemplateChooserCommand.getStaticResourcesDir();
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
            } catch (err) {
                console.warn(
                    `File '${landingPageJson}' does not exist at '${staticResourcesPath}'.`
                );
                landingPageExists = false;
                getSObjectsStatus.error = (err as Error).message;
            }

            if (landingPageExists) {
                const uem = CommonUtils.loadJsonFromFile(landingPagePath);
                getSObjectsStatus.sobjects = UEMParser.findSObjects(uem);
            }

            resolve(getSObjectsStatus);
        });
    }

    async createSObjectLwcQuickActions() {
        return new Promise<void>((resolve) => {
            new InstructionsWebviewProvider(
                this.extensionUri
            ).showInstructionWebview(
                l10n.t('Offline Starter Kit: Create sObject LWC Quick Actions'),
                'resources/instructions/createSObjectLwcQuickActions.html',
                [
                    {
                        type: 'generateLwcQuickActionsButton',
                        action: (panel) => {
                            panel.dispose();
                            return resolve();
                        }
                    },
                    {
                        type: 'getQuickActionStatus',
                        action: async (_panel, _data, callback) => {
                            if (callback) {
                                const quickActionStatus =
                                    await LwcGenerationCommand.checkForExistingQuickActions();
                                callback(quickActionStatus);
                            }
                        }
                    }
                ]
            );
        });
    }

    static async checkForExistingQuickActions(): Promise<SObjectQuickActionStatus> {
        return new Promise<SObjectQuickActionStatus>(async (resolve) => {
            const results: SObjectQuickActionStatus = { sobjects: {} };

            const sObjectsStatus = await this.getSObjectsFromLandingPage();
            if (sObjectsStatus.error) {
                results.error = sObjectsStatus.error;
                return resolve(results);
            }

            sObjectsStatus.sobjects.forEach((sobject) => {
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
        });
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
