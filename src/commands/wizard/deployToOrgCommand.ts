/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as path from 'path';
import { Uri, commands, window, workspace, l10n } from 'vscode';

export class DeployToOrgCommand {
    static async deployToOrg(): Promise<boolean> {
        const currentWorkspace = workspace;
        if (!currentWorkspace.workspaceFolders) {
            await window.showErrorMessage(
                l10n.t(
                    'There are no workspace folders defined in your project.'
                ),
                { title: l10n.t('OK') }
            );
            return Promise.resolve(false);
        }

        const result = await window.showInformationMessage(
            l10n.t('Do you want to deploy to an already-authorized Org?'),
            { title: l10n.t('Deploy') },
            { title: l10n.t('Cancel') }
        );

        if (!result || result.title === l10n.t('Cancel')) {
            return Promise.resolve(false);
        }

        const workspaceFolderPath =
            currentWorkspace.workspaceFolders[0].uri.fsPath;
        const forceAppPath = path.join(workspaceFolderPath, 'force-app');
        const forceAppUri = Uri.file(forceAppPath);
        await commands.executeCommand(
            'sfdx.force.source.deploy.source.path',
            forceAppUri
        );
        return Promise.resolve(true);
    }
}
