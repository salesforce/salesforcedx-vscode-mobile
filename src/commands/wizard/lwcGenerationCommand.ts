import { Uri, l10n } from 'vscode';
import { InstructionsWebviewProvider } from '../../webviews/instructions';

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
}
