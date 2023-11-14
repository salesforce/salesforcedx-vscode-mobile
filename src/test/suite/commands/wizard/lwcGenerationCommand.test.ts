/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as fs from 'fs';
import { afterEach, beforeEach } from 'mocha';
import {
    LwcGenerationCommand,
    SObjectQuickActionStatus
} from '../../../../commands/wizard/lwcGenerationCommand';
import { WorkspaceUtils } from '../../../../utils/workspaceUtils';

suite('LWC Generation Command Test Suite', () => {
    beforeEach(function () {});

    afterEach(function () {
        sinon.restore();
    });

    test('Quick Action directories check', async () => {
        const baseDir = 'force-app/main/default/quickActions';
        const statSyncStub = sinon.stub(fs, 'statSync');
        const statsStub = sinon.createStubInstance(fs.Stats);
        statsStub.isFile.returns(true);

        // stub the file system responses - any return value is a positive hit, an exception is a negative hit
        statSyncStub
            .withArgs(`${baseDir}/sobject1.view.quickAction-meta.xml`)
            .returns(statsStub);
        statSyncStub
            .withArgs(`${baseDir}/sobject1.edit.quickAction-meta.xml`)
            .returns(statsStub);
        statSyncStub
            .withArgs(`${baseDir}/sobject1.create.quickAction-meta.xml`)
            .returns(statsStub);

        statSyncStub
            .withArgs(`${baseDir}/sobject2.view.quickAction-meta.xml`)
            .throws('error');
        statSyncStub
            .withArgs(`${baseDir}/sobject2.edit.quickAction-meta.xml`)
            .throws('error');
        statSyncStub
            .withArgs(`${baseDir}/sobject2.create.quickAction-meta.xml`)
            .throws('error');

        const getSObjectsStub = sinon.stub(
            LwcGenerationCommand,
            'getSObjectsFromLandingPage'
        );
        getSObjectsStub.returns(
            Promise.resolve({ sobjects: ['sobject1', 'sobject2'] })
        );

        const result: SObjectQuickActionStatus =
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
    });

    test('Should return error status for landing page with invalid json', async () => {
        const getWorkspaceDirStub = sinon.stub(
            WorkspaceUtils,
            'getStaticResourcesDir'
        );
        getWorkspaceDirStub.returns(Promise.resolve('.'));
        const fsAccess = sinon.stub(fs, 'access');
        fsAccess.returns();
        const invalidJsonFile = 'landing_page.json';
        const invalidJsonContents = 'invalid_json_here';
        fs.writeFileSync(invalidJsonFile, invalidJsonContents, 'utf8');

        const status = await LwcGenerationCommand.getSObjectsFromLandingPage();

        assert.ok(status.error && status.error.length > 0);

        fs.unlinkSync(invalidJsonFile);
    });

    test('Should return 2 sObjects', async () => {
        const getWorkspaceDirStub = sinon.stub(
            WorkspaceUtils,
            'getStaticResourcesDir'
        );
        getWorkspaceDirStub.returns(Promise.resolve('.'));
        const fsAccess = sinon.stub(fs, 'access');
        fsAccess.returns();
        const validJsonFile = 'landing_page.json';
        const jsonContents =
            '{ "definition": "mcf/list", "properties": { "objectApiName": "Account" }, "nested": { "definition": "mcf/timedList", "properties": { "objectApiName": "Contact"} } }';
        fs.writeFileSync(validJsonFile, jsonContents, 'utf8');

        const status = await LwcGenerationCommand.getSObjectsFromLandingPage();

        assert.equal(status.sobjects.length, 2);
        assert.equal(status.sobjects[0], 'Account');
        assert.equal(status.sobjects[1], 'Contact');

        fs.unlinkSync(validJsonFile);
    });
});
