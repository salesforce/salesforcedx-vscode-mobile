/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import * as assert from 'assert';
import * as sinon from 'sinon';
import { suite, test, afterEach } from 'mocha';
import { OrgUtils } from '../../utils/orgUtils';
import {
    ConfigAggregator,
    StateAggregator,
    Connection,
    AuthInfo
} from '@salesforce/core';

suite('OrgUtils Test Suite', () => {
    afterEach(function () {
        OrgUtils.clearCache();
        sinon.restore();
    });

    let createConfigStub: sinon.SinonStub;
    let createStateStub: sinon.SinonStub;
    let createConnectionStub: sinon.SinonStub;
    let createAuthStub: sinon.SinonStub;
    let testOrgConfig = {
        key: 'target-org',
        value: 'testOrg'
    };

    let noOrgConfig = {
        key: 'target-org'
    };

    test('ObjectInfo is undefined if no org exists', async () => {
        const mockAggregator = {
            getInfo: sinon.stub().returns(noOrgConfig),
            reload: sinon.stub().resolves()
        };

        createConfigStub = sinon
            .stub(ConfigAggregator, 'create')
            .resolves(mockAggregator as unknown as ConfigAggregator);
        const objectInfo = await OrgUtils.getObjectInfo('Account');
        assert.strictEqual(
            objectInfo,
            undefined,
            'ObjectInfo should be undefined if on org exists'
        );
    });

    test('ObjectInfo is undefined if no username exists for the default org', async () => {
        const mockConfigAggregator = {
            getInfo: sinon.stub().returns(testOrgConfig),
            reload: sinon.stub().resolves()
        };

        const mockStateAggregator = {
            aliases: {
                getUsername: sinon.stub().returns(undefined)
            }
        };

        createConfigStub = sinon
            .stub(ConfigAggregator, 'create')
            .resolves(mockConfigAggregator as unknown as ConfigAggregator);

        createStateStub = sinon
            .stub(StateAggregator, 'getInstance')
            .resolves(mockStateAggregator as unknown as StateAggregator);

        const objectInfo = await OrgUtils.getObjectInfo('Account');
        assert.strictEqual(
            objectInfo,
            undefined,
            'ObjectInfo should be undefined if no username exists for the default org'
        );
    });

    test('ObjectInfo is undefined if no connection is available for the default user', async () => {
        // default org exists
        const mockConfigAggregator = {
            getInfo: sinon.stub().returns(testOrgConfig),
            reload: sinon.stub().resolves()
        };

        // user exists
        const mockStateAggregator = {
            aliases: {
                getPassword: sinon.stub().returns('pssd'),
                getUsername: sinon.stub().returns('tester')
            }
        };

        // connection is invalid
        const mockInvalidConnection = {
            getUsername: sinon.stub().returns(undefined)
        };

        createConfigStub = sinon
            .stub(ConfigAggregator, 'create')
            .resolves(mockConfigAggregator as unknown as ConfigAggregator);

        createStateStub = sinon
            .stub(StateAggregator, 'getInstance')
            .resolves(mockStateAggregator as unknown as StateAggregator);

        createConnectionStub = sinon
            .stub(Connection, 'create')
            .resolves(mockInvalidConnection as unknown as Connection);

        createAuthStub = sinon
            .stub(AuthInfo, 'create')
            .resolves({} as unknown as AuthInfo);

        const objectInfo = await OrgUtils.getObjectInfo('Account');
        assert.strictEqual(
            objectInfo,
            undefined,
            'ObjectInfo should be undefined if no connection is available for the default user'
        );
    });
});
