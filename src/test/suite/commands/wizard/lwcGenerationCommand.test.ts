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
    SObjectQuickActionStatus,
    QuickActionStatus
} from '../../../../commands/wizard/lwcGenerationCommand';

suite('LWC Generation Command Test Suite', () => {
    beforeEach(function () {});

    afterEach(function () {
        sinon.restore();
    });

    test('Quick Action directories check', async () => {
        const baseDir = 'force-app/main/default/quickActions';
        const statSyncStub = sinon.stub(fs, 'statSync');
        const statsStub = sinon.createStubInstance(fs.Stats);
        statsStub.isDirectory.returns(true);

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

        const result: SObjectQuickActionStatus =
            await LwcGenerationCommand.checkForExistingQuickActions([
                'sobject1',
                'sobject2'
            ]);

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
});
