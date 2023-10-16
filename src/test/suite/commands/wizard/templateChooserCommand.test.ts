/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import { workspace, Uri } from 'vscode';
import { SinonStub } from 'sinon';
import { afterEach, beforeEach } from 'mocha';
import { UIUtils } from '../../../../utils/uiUtils';
import {
    TemplateChooserCommand,
    TemplateQuickPickItem
} from '../../../../commands/wizard/templateChooserCommand';

suite('Template Chooser Command Test Suite', () => {
    beforeEach(function () {});

    afterEach(function () {
        sinon.restore();
    });

    test('Selects a template file and it is copied', async () => {
        const showQuickPickStub: SinonStub = sinon.stub(
            UIUtils,
            'showQuickPick'
        );

        // set up file picker
        const chosenItem: TemplateQuickPickItem = {
            label: 'Case Management',
            description: 'This is the description',
            detail: 'Contains a new case quick action, along with the 5 most recent cases, accounts, and contacts.',
            filenamePrefix: 'somefile'
        };

        showQuickPickStub.onCall(0).returns(chosenItem);

        // set up stubs for filesystem copy
        const testPath = '/somepath';
        const copyFileSyncStub = sinon.stub(fs, 'copyFileSync');
        const workspaceFoldersStub = sinon
            .stub(workspace, 'workspaceFolders')
            .get(() => [{ uri: Uri.file(testPath) }]);

        // execute our command
        // await TemplateChooserCommand.chooseTemplate();

        // ensure copy was performed for both json and metadata files
        for (const fileExtension of [
            TemplateChooserCommand.LANDING_PAGE_JSON_FILE_EXTENSION,
            TemplateChooserCommand.LANDING_PAGE_METADATA_FILE_EXTENSION
        ]) {
            const expectedSourcePath = path.join(
                testPath,
                TemplateChooserCommand.STATIC_RESOURCES_PATH,
                `somefile${fileExtension}`
            );
            const expectedDestinationPath = path.join(
                testPath,
                TemplateChooserCommand.STATIC_RESOURCES_PATH,
                `${TemplateChooserCommand.LANDING_PAGE_FILENAME_PREFIX}${fileExtension}`
            );
            assert.ok(
                copyFileSyncStub.calledWith(
                    expectedSourcePath,
                    expectedDestinationPath
                ),
                `Should attempt to copy ${expectedSourcePath} to ${expectedDestinationPath}`
            );
        }
    });

    test('Nothing is selected', async () => {
        const showQuickPickStub: SinonStub = sinon.stub(
            UIUtils,
            'showQuickPick'
        );

        showQuickPickStub.onCall(0).returns(undefined);

        // execute our command and get the promise to ensure expected value is received.
        // let promise = TemplateChooserCommand.chooseTemplate();
        // let result = await promise;
        // assert.equal(result, undefined);
    });
});
