/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { QuickPickItem, Uri, l10n } from 'vscode';
import { UIUtils } from '../utils/uiUtils';
import { workspace } from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { InstructionsWebviewProvider } from '../webviews';

export interface TemplateQuickPickItem extends QuickPickItem {
    filenamePrefix: string;
}

/**
 * This command will prompt the user to select one of the canned landing page templates, and will simply copy it to "landing_page.json".
 * When the project is deployed to the user's org, this file will also be copied into static resources and picked up by SApp+.
 */
export class TemplateChooserCommand {
    static readonly STATIC_RESOURCES_PATH =
        '/force-app/main/default/staticresources';
    static readonly LANDING_PAGE_DESTINATION_FILENAME_PREFIX = 'landing_page';
    static readonly JSON_FILE_EXTENSION = '.json';
    static readonly METADATA_FILE_EXTENSION = '.resource-meta.xml';

    static readonly TEMPLATE_LIST_ITEMS: TemplateQuickPickItem[] = [
        {
            label: l10n.t('Default'),
            detail: l10n.t(
                'Recently viewed Contacts, Accounts, and Opportunities.'
            ),
            filenamePrefix: 'landing_page_default'
        },
        {
            label: l10n.t('Case Management'),
            detail: l10n.t(
                'New Case action and the 5 most recent Cases, Accounts, and Contacts.'
            ),
            filenamePrefix: 'landing_page_case_management'
        },
        {
            label: l10n.t('Healthcare'),
            detail: l10n.t(
                'Global quick actions with BarcodeScanner, new Visitor, and more.'
            ),
            filenamePrefix: 'landing_page_healthcare'
        },
        {
            label: l10n.t('Retail Execution'),
            detail: l10n.t(
                'Global quick actions with new Opportunity, new Lead, and more.'
            ),
            filenamePrefix: 'landing_page_retail_execution'
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

        await TemplateChooserCommand.copySelectedFiles(
            (selectedItem as TemplateQuickPickItem).filenamePrefix
        );
    }

    public static async copyDefaultTemplate(extensionUri: Uri) {
        await TemplateChooserCommand.copySelectedFiles(
            TemplateChooserCommand.TEMPLATE_LIST_ITEMS[0].filenamePrefix
        );

        InstructionsWebviewProvider.showDismissableInstructions(
            extensionUri,
            l10n.t('Landing Page Customization'),
            'src/instructions/landingpage.html'
        );
    }

    /**
     * This will copy the given template files over to the staticresources/landing_page.* locations, including
     * the .json and .resource-meta.xml file.
     * @param fileNamePrefix filename prefix of the template file to copy.
     */
    static async copySelectedFiles(fileNamePrefix: string): Promise<boolean> {
        const workspaceFolders = workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const rootPath = workspaceFolders[0].uri.fsPath;

            // copy both the json and metadata files.
            for (const fileExtension of [
                TemplateChooserCommand.JSON_FILE_EXTENSION,
                TemplateChooserCommand.METADATA_FILE_EXTENSION
            ]) {
                const fileName = `${fileNamePrefix}${fileExtension}`;
                const destinationFileName = `${TemplateChooserCommand.LANDING_PAGE_DESTINATION_FILENAME_PREFIX}${fileExtension}`;
                console.log(`Copying ${fileName} to ${destinationFileName}`);

                const sourcePath = path.join(
                    rootPath,
                    TemplateChooserCommand.STATIC_RESOURCES_PATH,
                    fileName
                );
                const destinationPath = path.join(
                    rootPath,
                    TemplateChooserCommand.STATIC_RESOURCES_PATH,
                    destinationFileName
                );

                fs.copyFileSync(sourcePath, destinationPath);
            }
            return Promise.resolve(true);
        }
        return Promise.reject('Could not determine workspace folder.');
    }
}
