/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { ProgressLocation, Uri, window } from 'vscode';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import { InstructionsWebviewProvider } from '../webviews';
import { messages } from '../messages/messages';

export class BriefcaseCommand {
    static async setupBriefcase(extensionUri: Uri): Promise<boolean> {
        await window.showInformationMessage(
            'Click OK to launch your org to the Briefcase Builder page. After ' +
                'launching, return here for instructions to set up a Briefcase rule.',
            { title: 'OK' }
        );

        // TODO: this `withProgress` call probably needs tweaking on UX.
        await window.withProgress(
            {
                location: ProgressLocation.Notification,
                title: 'Launching Briefcase Builder...'
            },
            async (progress, token) => {
                await CommonUtils.executeCommandAsync(
                    "sfdx org open -p '/lightning/setup/Briefcase/home'"
                );
            }
        );

        InstructionsWebviewProvider.showDismissableInstructions(
            extensionUri,
            messages.getMessage('briefcase_setup_instruction'),
            'src/instructions/briefcase.html'
        );

        return Promise.resolve(true);
    }
}
