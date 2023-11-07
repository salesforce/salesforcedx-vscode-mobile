import { Uri, l10n } from 'vscode';
import { InstructionsWebviewProvider } from '../../webviews/instructions';
import { TemplateChooserCommand } from './templateChooserCommand';
import { access } from 'fs/promises';
import { UEMParser } from '../../utils/uemParser';
import * as fs from 'fs';
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

export class LwcGenerationCommand {
    extensionUri: Uri;

    constructor(extensionUri: Uri) {
        this.extensionUri = extensionUri;
    }

    static readFileAsJsonObject(
        filePath: string,
        callback: (error: Error | null, data: any) => void
    ): void {
        fs.readFile(filePath, 'utf8', (error, data) => {
            if (error) {
                callback(error, null);
            } else {
                try {
                    const jsonObject = JSON.parse(data);
                    callback(null, jsonObject);
                } catch (parseError: any) {
                    callback(parseError, null);
                }
            }
        });
    }

    static async getCreateLwcPageSobjects(): Promise<Array<string>> {
        return new Promise<Array<string>>(async (resolve) => {
            let sObjects: Array<string> = [];
            let landingPageExists = true;

            const staticResourcesPath =
                await TemplateChooserCommand.getStaticResourcesDir();
            const landingPageJson = 'landing_page.json';
            const landingPagePath = path.join(
                staticResourcesPath,
                landingPageJson
            );

            try {
                await access(landingPagePath);
            } catch (err) {
                console.warn(
                    `File '${landingPageJson}' does not exist at '${staticResourcesPath}'.`
                );
                landingPageExists = false;
            }

            if (landingPageExists) {
                this.readFileAsJsonObject(
                    landingPagePath,
                    (error: Error | null, data: any) => {
                        if (error) {
                            console.warn(`Error reading ${landingPageJson}`);
                        } else {
                            sObjects = UEMParser.findFieldValues(
                                data,
                                'objectApiName'
                            );
                        }
                        resolve(sObjects);
                    }
                );
            } else {
                resolve(sObjects);
            }
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
                            // TODO: Hook this up to function that parses landing_page.json.
                            const sobjects = [
                                'Account',
                                'Contact',
                                'Opportunity',
                                'SomeOther'
                            ];
                            if (callback) {
                                const quickActionStatus =
                                    await LwcGenerationCommand.checkForExistingQuickActions(
                                        sobjects
                                    );
                                callback(quickActionStatus);
                            }
                        }
                    },
                    {
                        type: 'createLwcPageStatus',
                        action: async (_panel, _data, callback) => {
                            if (callback) {
                                const sObjects = await LwcGenerationCommand.getCreateLwcPageSobjects();
                                callback(sObjects);
                            }
                        }
                    }
                ]
            );
        });
    }

    static async checkForExistingQuickActions(
        sobjects: string[]
    ): Promise<SObjectQuickActionStatus> {
        return new Promise<SObjectQuickActionStatus>(async (resolve) => {
            const results: SObjectQuickActionStatus = { sobjects: {} };

            sobjects.forEach((sobject) => {
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
