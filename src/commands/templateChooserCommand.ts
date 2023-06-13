/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { QuickPickItem, l10n } from 'vscode';
import { UIUtils } from '../utils/uiUtils';
import { workspace } from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface TemplateQuickPickItem extends QuickPickItem {
    filename: string;
}

/**
 * This command will prompt the user to select one of the canned landing page templates, and will simply copy it to "landing_page.json".
 * When the project is deployed to the user's org, this file will also be copied into static resources and picked up by SApp+.
 */
export class TemplateChooserCommand {
    static readonly STATIC_RESOURCES_PATH =
        '/force-app/main/default/staticresources';
    static readonly LANDING_PAGE_FILENAME = 'landing_page.json';

    static readonly TEMPLATE_LIST_ITEMS: TemplateQuickPickItem[] = [
        {
            label: l10n.t('Default'),
            detail: l10n.t(
                'Recently viewed Contacts, Accounts, and Opportunities.'
            ),
            filename: 'landing_page_default.json'
        },
        {
            label: l10n.t('Case Management'),
            detail: l10n.t(
                'New Case action and the 5 most recent Cases, Accounts, and Contacts.'
            ),
            filename: 'landing_page_case_management.json'
        },
        {
            label: l10n.t('Healthcare'),
            detail: l10n.t(
                'Global quick actions with BarcodeScanner, new Visitor, and more.'
            ),
            filename: 'landing_page_healthcare.json'
        },
        {
            label: l10n.t('Retail Execution'),
            detail: l10n.t(
                'Global quick actions with new Opportunity, new Lead, and more.'
            ),
            filename: 'landing_page_retail_execution.json'
        }
    ];

    public static async chooseTemplate() {
        const selectedItem = await UIUtils.showQuickPick(
            l10n.t('Select a template...'),
            undefined,
            () => {
                return new Promise<QuickPickItem[]>(async (resolve, reject) => {
                    resolve(TemplateChooserCommand.TEMPLATE_LIST_ITEMS);
                });
            }
        );

        if (!selectedItem) {
            return Promise.resolve();
        }

        await TemplateChooserCommand.copySelectedFile(
            (selectedItem as TemplateQuickPickItem).filename
        );
    }

    /**
     * This will copy the given template filename over to the staticresources/landing_page.json location.
     * @param fileName name of the template file to copy.
     */
    static async copySelectedFile(fileName: string): Promise<boolean> {
        const workspaceFolders = workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const rootPath = workspaceFolders[0].uri.fsPath;
            const sourcePath = path.join(
                rootPath,
                TemplateChooserCommand.STATIC_RESOURCES_PATH,
                fileName
            );
            const destinationPath = path.join(
                rootPath,
                TemplateChooserCommand.STATIC_RESOURCES_PATH,
                TemplateChooserCommand.LANDING_PAGE_FILENAME
            );

            fs.copyFileSync(sourcePath, destinationPath);
            return Promise.resolve(true);
        }
        return Promise.reject('Could not determine workspace folder.');
    }
}
