/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { commands, window, l10n } from 'vscode';
import { OrgUtils } from '../../utils/orgUtils';

export class AuthorizeCommand {
    static async authorizeToOrg(): Promise<boolean> {
        try {
            await OrgUtils.getDefaultUser();
            return Promise.resolve(true);
        } catch {
            // Ask user to authorize to an org now only if not authorized yet.
            const result = await window.showInformationMessage(
                l10n.t('Do you want to authorize an Org now?'),
                { title: l10n.t('Authorize') },
                { title: l10n.t('No') }
            );

            if (!result || result.title === l10n.t('No')) {
                return Promise.resolve(false);
            } else {
                await commands.executeCommand('sfdx.force.auth.web.login');
                await window.showInformationMessage(
                    l10n.t(
                        "Once you've authorized your Org, click here to continue."
                    ),
                    { title: l10n.t('OK') }
                );
                return Promise.resolve(true);
            }
        }
    }
}
