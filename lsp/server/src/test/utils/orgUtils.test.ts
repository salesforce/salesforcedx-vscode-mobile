/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import * as assert from 'assert';
import * as sinon from 'sinon';
import { suite, test, beforeEach, afterEach } from 'mocha';
import { OrgUtils } from '../../utils/orgUtils';

import {
    setupTempWorkspaceDirectoryStub,
    TempProjectDirManager,
    stubCreateAuth,
    stubCreateConnection,
    stubGetInstanceState,
    stubCreateConfig
} from '../TestHelper';
import { ObjectInfoRepresentation } from '../../types';

suite('OrgUtils Test Suite - Server', () => {
    let sandbox: sinon.SinonSandbox;

    beforeEach(function () {
        sandbox = sinon.createSandbox();
    });
    afterEach(function () {
        OrgUtils.reset();
        sandbox.restore();
    });

    let createConfigStub: sinon.SinonStub;
    let getInstanceStateStub: sinon.SinonStub;

    test('ObjectInfo is undefined if no org exists', async () => {
        createConfigStub = stubCreateConfig(sandbox, false);
        const objectInfo = await OrgUtils.getObjectInfo('Account');
        assert.strictEqual(
            objectInfo,
            undefined,
            'ObjectInfo should be undefined if on org exists'
        );
    });

    test('ObjectInfo is undefined if no username exists for the default org', async () => {
        createConfigStub = stubCreateConfig(sandbox, true);
        getInstanceStateStub = stubGetInstanceState(sandbox, false);

        const objectInfo = await OrgUtils.getObjectInfo('Account');
        assert.strictEqual(
            objectInfo,
            undefined,
            'ObjectInfo should be undefined if no username exists for the default org'
        );
    });

    test('ObjectInfo is undefined if no connection is available for the default user', async () => {
        // default config exists
        createConfigStub = stubCreateConfig(sandbox, true);
        // user exists
        getInstanceStateStub = stubGetInstanceState(sandbox, true);
        // connection is invalid
        const { connectionStub: createConnectionStub } = stubCreateConnection(
            sandbox,
            false
        );

        stubCreateAuth(sandbox);

        const objectInfo = await OrgUtils.getObjectInfo('Account');
        assert.strictEqual(
            objectInfo,
            undefined,
            'ObjectInfo should be undefined if no connection is available for the default user'
        );
    });

    test('ObjectInfo is fetched if auth status is connection is available and auth status is authorized', async () => {
        // user exists

        createConfigStub = stubCreateConfig(sandbox, true);
        getInstanceStateStub = stubGetInstanceState(sandbox, true);
        const { requestStub, connectionStub: createConnectionStub } =
            stubCreateConnection(sandbox, true);
        stubCreateAuth(sandbox);

        // Stub 'getWorkspaceDir'
        const tempWorkSpaceDirManager =
            await TempProjectDirManager.createTempProjectDir();

        setupTempWorkspaceDirectoryStub(sandbox, tempWorkSpaceDirManager);
        let objectInfo: ObjectInfoRepresentation | undefined;

        try {
            objectInfo = await OrgUtils.getObjectInfo('Account');
            assert.ok(objectInfo, 'object Info is fetched from web');
            assert.strictEqual(
                requestStub.callCount,
                1,
                'object info request is issued once'
            );
            assert.strictEqual(
                objectInfo.apiName,
                'Account',
                'entity name should be correct'
            );
            assert.strictEqual(
                objectInfo.fields['BillingCity'].dataType,
                'String',
                'field data type should be correct'
            );

            objectInfo = await OrgUtils.getObjectInfo('Account');
            assert.ok(objectInfo, 'object Info is fetched from cache');
            assert.strictEqual(
                objectInfo.apiName,
                'Account',
                'entity name should be correct'
            );
            assert.strictEqual(
                objectInfo.fields['BillingCity'].dataType,
                'String',
                'field data type should be correct'
            );
            assert.strictEqual(
                requestStub.callCount,
                1,
                'object info request is not sent out again since it is already in cache'
            );
        } finally {
            tempWorkSpaceDirManager.removeDir();
        }
    });
});
