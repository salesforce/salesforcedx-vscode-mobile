/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import path = require('path');
import { Uri, commands, window, workspace } from 'vscode';

export class DeployToOrgCommand {
    static async deployToOrg(): Promise<boolean> {
        const currentWorkspace = workspace;
        if (!currentWorkspace.workspaceFolders) {
            await window.showErrorMessage(
                'There are no workspace folders defined in your project.',
                { title: 'OK' }
            );
            return Promise.resolve(false);
        }

        const result = await window.showInformationMessage(
            'Do you want to deploy to an already-authorized Org?',
            { title: 'Deploy' },
            { title: 'Cancel' }
        );

        if (!result || result.title === 'Cancel') {
            return Promise.reject(false);
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
