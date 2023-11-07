import { Uri, l10n } from 'vscode';
import { InstructionsWebviewProvider } from '../../webviews/instructions';
import * as fs from 'fs';

export interface QuickActionFlags {
    [name: string]: {
        view: boolean;
        edit: boolean;
        create: boolean;
    };
}

export class LwcGenerationCommand {
    extensionUri: Uri;

    constructor(extensionUri: Uri) {
        this.extensionUri = extensionUri;
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
                    }
                ]
            );
        });
    }

    static checkForExistingQuickActions(sobjects: string[]): QuickActionFlags {
        const results: QuickActionFlags = {};
        sobjects.forEach((sobject) => {
            results[sobject] = {
                view: false,
                edit: false,
                create: false,        
            };
            results[sobject].view = LwcGenerationCommand.checkForExistingQuickAction(sobject, "view");
            results[sobject].edit = LwcGenerationCommand.checkForExistingQuickAction(sobject, "edit");
            results[sobject].create = LwcGenerationCommand.checkForExistingQuickAction(sobject, "create");
        });

        return results;
    }

    private static checkForExistingQuickAction(sobject: string, qaName: string): boolean {
        const expectedDirName = `${sobject}.${qaName}.quickAction-meta.xml`;
        try {
            // Check if the qa directory exists
            const stats = fs.statSync(`force-app/main/default/quickActions/${expectedDirName}`);
            return stats.isDirectory();
        } catch (error) {
            // If an error occurs, the directory does not exist
            return false;
        }
    }
}
