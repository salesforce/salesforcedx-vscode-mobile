/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { QuickPickItem } from 'vscode';
import { messages } from '../messages/messages';
import { UIUtils } from './uiUtils';
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
    // eslint-disable-next-line @typescript-eslint/naming-convention
    static readonly STATIC_RESOURCES_PATH =
        '/force-app/main/default/staticresources';
    // eslint-disable-next-line @typescript-eslint/naming-convention
    static readonly LANDING_PAGE_FILENAME = 'landing_page.json';

    // eslint-disable-next-line @typescript-eslint/naming-convention
    static readonly TEMPLATE_LIST_ITEMS: TemplateQuickPickItem[] = [
        {
            label: messages.getMessage('template_chooser_default_label'),
            description: messages.getMessage(
                'template_chooser_default_description'
            ),
            detail: messages.getMessage('template_chooser_default_detail'),
            filename: messages.getMessage('template_chooser_default_filename')
        },
        {
            label: messages.getMessage('template_chooser_case_label'),
            description: messages.getMessage(
                'template_chooser_case_description'
            ),
            detail: messages.getMessage('template_chooser_case_detail'),
            filename: messages.getMessage('template_chooser_case_filename')
        },
        {
            label: messages.getMessage('template_chooser_healthcare_label'),
            description: messages.getMessage(
                'template_chooser_healthcare_description'
            ),
            detail: messages.getMessage('template_chooser_healthcare_detail'),
            filename: messages.getMessage(
                'template_chooser_healthcare_filename'
            )
        },
        {
            label: messages.getMessage('template_chooser_retail_label'),
            description: messages.getMessage(
                'template_chooser_retail_description'
            ),
            detail: messages.getMessage('template_chooser_retail_detail'),
            filename: messages.getMessage('template_chooser_retail_filename')
        }
    ];

    public static async chooseTemplate() {
        const selectedItem = await UIUtils.showQuickPick(
            messages.getMessage('quickpick_template_select'),
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
