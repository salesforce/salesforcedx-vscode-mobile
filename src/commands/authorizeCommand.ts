// /*
//  * Copyright (c) 2023, salesforce.com, inc.
//  * All rights reserved.
//  * SPDX-License-Identifier: MIT
//  * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
//  */

import { commands, window } from 'vscode';
import { OrgUtils } from '../utils/orgUtils';

export class AuthorizeCommand {
    static async authorizeToOrg(): Promise<boolean> {
        const user = await OrgUtils.getDefaultUser();

        // Ask user to authorize to an org now only if not authorized yet.
        if (user === 'undefined') {
            const result = await window.showInformationMessage(
                'Do you want to authorize an Org now?',
                { title: 'Authorize' },
                { title: 'No' }
            );

            if (result) {
                if (result.title === 'No') {
                    return Promise.resolve(false);
                } else {
                    await commands.executeCommand('sfdx.force.auth.web.login');
                    await window.showInformationMessage(
                        "Once you've authorized your Org, click here to continue.",
                        { title: 'OK' }
                    );
                    return Promise.resolve(true);
                }
            } else {
                return Promise.resolve(false);
            }
        } else {
            return Promise.resolve(true);
        }
    }
}
