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
import {
    TemplateChooserCommand,
    TemplateQuickPickItem
} from '../../landingPage/templateChooserCommand';
import { SinonStub } from 'sinon';
import { afterEach, beforeEach } from 'mocha';
import { UIUtils } from '../../landingPage/uiUtils';

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
            filename: 'somefile.json'
        };

        showQuickPickStub.onCall(0).returns(chosenItem);

        // set up stubs for filesystem copy
        const testPath = '/somepath';
        const copyFileSyncStub = sinon.stub(fs, 'copyFileSync');
        const workspaceFoldersStub = sinon
            .stub(workspace, 'workspaceFolders')
            .get(() => [{ uri: Uri.file(testPath) }]);

        // execute our command
        await TemplateChooserCommand.chooseTemplate();

        // ensure copy was performed
        const expectedSourcePath = path.join(
            testPath,
            TemplateChooserCommand.STATIC_RESOURCES_PATH,
            'somefile.json'
        );
        const expectedDestinationPath = path.join(
            testPath,
            TemplateChooserCommand.STATIC_RESOURCES_PATH,
            TemplateChooserCommand.LANDING_PAGE_FILENAME
        );
        assert.ok(
            copyFileSyncStub.calledWith(
                expectedSourcePath,
                expectedDestinationPath
            )
        );
    });

    test('Nothing is selected', async () => {
        const showQuickPickStub: SinonStub = sinon.stub(
            UIUtils,
            'showQuickPick'
        );

        showQuickPickStub.onCall(0).returns(undefined);

        // execute our command and get the promise to ensure expected value is received
        let promise = TemplateChooserCommand.chooseTemplate();
        let result = await promise;
        assert.equal(result, undefined);
    });
});
