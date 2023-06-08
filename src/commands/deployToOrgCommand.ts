/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import path = require('path');
import { ExtensionContext, Uri, commands, window, workspace } from 'vscode';

export class DeployToOrgCommand {
    static async deployToOrg(): Promise<boolean> {
        // TODO: Check to see if the Salesforce Extension Pack is installed.
        // The commented code below starts the process.
        // const extension = vscode.extensions.getExtension(
        //   "salesforce.salesforcedx-vscode"
        // );
        // console.log(`Extension: ${extension}`);

        const currentWorkspace = workspace;
        if (!currentWorkspace.workspaceFolders) {
            await window.showErrorMessage(
                'There are no workspace folders defined in your project.',
                { title: 'OK' }
            );
            return Promise.resolve(false);
        }

        const result = await window.showInformationMessage(
            'Do you want to authorize an Org, or deploy to an already-authorized Org?',
            { title: 'Authorize' },
            { title: 'Deploy' }
        );

        if (!result) {
            return Promise.resolve(false);
        }

        if (result.title === 'Authorize') {
            await commands.executeCommand('sfdx.force.auth.web.login');
            await window.showInformationMessage(
                "Once you've authorized your Org, click here to continue.",
                { title: 'OK' }
            );
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
