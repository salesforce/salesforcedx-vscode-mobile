import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { OrgUtils } from '../../landingPage/orgUtils';
import { SinonStub } from 'sinon';
import { afterEach, beforeEach } from 'mocha';
import { ConfigAggregator, ConfigInfo, Connection, Org, OrgConfigProperties } from '@salesforce/core';
import { DescribeGlobalResult } from 'jsforce';

suite('Org Utils Test Suite', () => {

    beforeEach(function () {
    });

    afterEach(function () {
        sinon.restore();
    });

    test('Default username is retrieved', async () => {
        const config: SinonStub = sinon.stub(ConfigAggregator, 'create');
        config.returns({
            getInfo: (key: OrgConfigProperties) => {
                switch (key) {
                    case OrgConfigProperties.TARGET_ORG:
                        return {
                            value: "username"
                        };
                    default: return "BAD";
                }
            }
        });

        const defaultUser = await OrgUtils.getDefaultUser();

        assert.equal(defaultUser, "username");
    });

    test('Returns list of sobjects', async () => {
        const describeGlobalResult: DescribeGlobalResult = {
            encoding: 'utf-8',
            maxBatchSize: 1,
            sobjects: [
                {
                    name: 'SomeObject',
                    label: 'Label',
                    labelPlural: 'Labels',
                    activateable: true,
                    createable: true,
                    custom: false,
                    customSetting: false,
                    deepCloneable: false,
                    deletable: false,
                    deprecatedAndHidden: false,
                    feedEnabled: false,
                    hasSubtypes: false,
                    isInterface: false,
                    isSubtype: false,
                    keyPrefix: '',
                    layoutable: true,
                    mergeable: false,
                    mruEnabled: true,
                    queryable: true,
                    replicateable: false,
                    retrieveable: true,
                    searchable: true,
                    triggerable: true,
                    undeletable: true,
                    updateable: true,
                    urls: {}
                }
            ],

        };

        const orgStub: SinonStub = sinon.stub(Org, 'create');
        const stubConnection = sinon.createStubInstance(Connection);
        stubConnection.describeGlobal.returns(Promise.resolve(describeGlobalResult));

        orgStub.returns(
            {
                getConnection: () => {
                    return stubConnection;
                }
            }
        );

        const sobjects = await OrgUtils.getSobjects();

        assert.equal(sobjects.length, 1);

        const sobject = sobjects[0];
        assert.equal(sobject.apiName, 'SomeObject');
        assert.equal(sobject.label, 'Label');
        assert.equal(sobject.labelPlural, 'Labels');
    });

});
