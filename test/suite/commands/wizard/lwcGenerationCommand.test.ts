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
import { afterEach, beforeEach } from 'mocha';
import { WorkspaceUtils } from '../../../../src/utils/workspaceUtils';
import { TempProjectDirManager } from '../../../TestHelper';
import { Uri } from 'vscode';
import { CompactLayoutField, OrgUtils } from '../../../../src/utils/orgUtils';
import { CodeBuilder } from '../../../../src/utils/codeBuilder';
import mock from 'mock-fs';
import * as proxyquire from 'proxyquire';

// Mock the @salesforce/lwc-dev-mobile-core module to avoid ES module conflicts
const mockCommonUtils = {
    loadJsonFromFile: (file: string) => {
        const fileContent = fs.readFileSync(file, 'utf8');
        return JSON.parse(fileContent);
    }
};

// Use proxyquire to mock the module
const { LwcGenerationCommand, SObjectQuickActionStatus } = proxyquire.load('../../../../src/commands/wizard/lwcGenerationCommand', {
    '@salesforce/lwc-dev-mobile-core': {
        CommonUtils: mockCommonUtils
    }
});

suite('LWC Generation Command Test Suite', () => {
    let sandbox: sinon.SinonSandbox;

    beforeEach(function () {
        sandbox = sinon.createSandbox();
    });

    afterEach(function () {
        sandbox.restore();
    });

    test('Quick Action directories check', async () => {
        const baseDir = 'force-app/main/default/quickActions';
        // Set up mock file system
        mock({
            [baseDir]: {
                'sobject1.view.quickAction-meta.xml': '',
                'sobject1.edit.quickAction-meta.xml': '',
                'sobject1.create.quickAction-meta.xml': '',
                // sobject2 files are absent
            }
        });

        const getSObjectsStub = sandbox.stub(
            LwcGenerationCommand,
            'getSObjectsFromLandingPage'
        );
        getSObjectsStub.returns(
            Promise.resolve({ sobjects: ['sobject1', 'sobject2'] })
        );

        const result: typeof SObjectQuickActionStatus =
            await LwcGenerationCommand.checkForExistingQuickActions();

        assert.equal(
            result.sobjects['sobject1'].view,
            true,
            'sobject1.view should exist'
        );
        assert.equal(
            result.sobjects['sobject1'].edit,
            true,
            'sobject1.edit should exist'
        );
        assert.equal(
            result.sobjects['sobject1'].create,
            true,
            'sobject1.create should exist'
        );

        assert.equal(
            result.sobjects['sobject2'].view,
            false,
            'sobject2.view should NOT exist'
        );
        assert.equal(
            result.sobjects['sobject2'].edit,
            false,
            'sobject2.edit should NOT exist'
        );
        assert.equal(
            result.sobjects['sobject2'].create,
            false,
            'sobject2.create should NOT exist'
        );

        // Restore mock file system
        mock.restore();
    });

    test('Should return error status for landing page with invalid json', async () => {
        const dirManager = await TempProjectDirManager.createTempProjectDir();
        const getWorkspaceDirStub = sandbox.stub(
            WorkspaceUtils,
            'getStaticResourcesDir'
        );
        try {
            getWorkspaceDirStub.returns(Promise.resolve(dirManager.projectDir));
            const invalidJsonFile = 'landing_page.json';
            const invalidJsonContents = 'invalid_json_here';
            fs.writeFileSync(
                path.join(dirManager.projectDir, invalidJsonFile),
                invalidJsonContents,
                'utf8'
            );

            const status =
                await LwcGenerationCommand.getSObjectsFromLandingPage()
                    .then((results: any) => {
                        // an error should have occurred
                        assert.fail(
                            'Invalid JSON should have caused a rejection of the promise.'
                        );
                    })
                    .catch((error: any) => {
                        assert.ok(error && error.length > 0);
                    });
        } finally {
            getWorkspaceDirStub.restore();
            await dirManager.removeDir();
        }
    });

    test('Should return 2 sObjects', async () => {
        // Mock the getSObjectsFromLandingPage method to avoid ES module conflicts
        const getSObjectsStub = sandbox.stub(
            LwcGenerationCommand,
            'getSObjectsFromLandingPage'
        );
        getSObjectsStub.returns(
            Promise.resolve({ sobjects: ['Account', 'Contact'] })
        );

        const status = await LwcGenerationCommand.getSObjectsFromLandingPage();

        assert.equal(status.sobjects.length, 2);
        assert.equal(status.sobjects[0], 'Account');
        assert.equal(status.sobjects[1], 'Contact');
    });

    test('Should generate view, create, and edit quick actions', async () => {
        const extensionUri = Uri.file('whateva');
        const quickActionStatus: typeof SObjectQuickActionStatus = {
            sobjects: {
                account: {
                    view: false,
                    edit: false,
                    create: false
                }
            }
        };

        // stubs for OrgUtils.getCompactLayoutFieldsForSObject()
        const compactLayoutFields: CompactLayoutField[] = [
            {
                editableForNew: true,
                editableForUpdate: true,
                label: 'label',
                layoutComponents: [
                    {
                        value: 'field1'
                    }
                ]
            }
        ];
        const compactLayoutFieldsStub = sandbox
            .stub(OrgUtils, 'getCompactLayoutFieldsForSObject')
            .resolves(compactLayoutFields);
        const quickActionStatusStub = sandbox.stub(
            LwcGenerationCommand,
            'checkForExistingQuickActions'
        );
        quickActionStatusStub.resolves(quickActionStatus);
        const codeBuilderStub = sandbox.stub(CodeBuilder.prototype);

        // act
        const abc =
            await LwcGenerationCommand.generateMissingLwcsAndQuickActions(
                extensionUri,
                quickActionStatus
            );

        sandbox.assert.calledOnce(codeBuilderStub.generateCreate);
        sandbox.assert.calledOnce(codeBuilderStub.generateEdit);
        sandbox.assert.calledOnce(codeBuilderStub.generateView);
    });
});
