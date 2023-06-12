/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import { OrgUtils } from '../../../utils/orgUtils';
import { SinonStub } from 'sinon';
import { afterEach, beforeEach } from 'mocha';
import {
    ConfigAggregator,
    Connection,
    Org,
    OrgConfigProperties
} from '@salesforce/core';
import {
    DescribeGlobalResult,
    DescribeSObjectResult,
    Field as FieldType
} from 'jsforce';

suite('Org Utils Test Suite', () => {
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
        ]
    };

    beforeEach(function () {});

    afterEach(function () {
        sinon.restore();
    });

    test('Default username is retrieved', async () => {
        const reloadSpy = sinon.spy(() => {
            return Promise.resolve;
        });
        
        const config: SinonStub = sinon.stub(ConfigAggregator, 'create');
        config.returns({
            getInfo: (key: OrgConfigProperties) => {
                switch (key) {
                    case OrgConfigProperties.TARGET_ORG:
                        return {
                            value: 'username'
                        };
                    default:
                        return 'BAD';
                }
            },
            reload: reloadSpy
        });

        const defaultUser = await OrgUtils.getDefaultUser();

        assert.equal(defaultUser, 'username');
        assert.equal(reloadSpy.called, true, "reload should be invoked");
    });

    test('Returns list of sobjects', async () => {
        const orgStub: SinonStub = sinon.stub(Org, 'create');
        const stubConnection = sinon.createStubInstance(Connection);
        stubConnection.describeGlobal.returns(
            Promise.resolve(describeGlobalResult)
        );

        orgStub.returns({
            getConnection: () => {
                return stubConnection;
            }
        });

        const sobjects = await OrgUtils.getSobjects();

        assert.equal(sobjects.length, 1);

        const sobject = sobjects[0];
        assert.equal(sobject.apiName, 'SomeObject');
        assert.equal(sobject.label, 'Label');
        assert.equal(sobject.labelPlural, 'Labels');
    });

    test('Returns list of fields for given sobject', async () => {
        const sobjectFields: FieldType[] = [
            buildField('City', 'string', 'Label'),
            buildField('Name', 'string', 'ObjectName')
        ];
        const sobjectDescribeFields = describeGlobalResult.sobjects[0];
        const describeSobjectResult: DescribeSObjectResult = {
            ...sobjectDescribeFields,
            actionOverrides: [],
            childRelationships: [],
            compactLayoutable: false,
            fields: [...sobjectFields],
            listviewable: true,
            lookupLayoutable: true,
            namedLayoutInfos: [],
            networkScopeFieldName: '',
            recordTypeInfos: [],
            searchLayoutable: true,
            supportedScopes: null
        };

        const orgStub: SinonStub = sinon.stub(Org, 'create');
        const stubConnection = sinon.createStubInstance(Connection);
        stubConnection.describe
            .withArgs('SomeObject')
            .returns(Promise.resolve(describeSobjectResult));

        orgStub.returns({
            getConnection: () => {
                return stubConnection;
            }
        });

        const fields = await OrgUtils.getFieldsForSObject(
            describeSobjectResult.name
        );

        assert.equal(fields.length, 2);

        // Ensure we mapped thing correctly.
        for (let i = 0; i < fields.length; i++) {
            assert.equal(fields[i].apiName, sobjectFields[i].name);
            assert.equal(fields[i].label, sobjectFields[i].label);
            assert.equal(fields[i].type, sobjectFields[i].type);
        }
    });

    function buildField(
        apiName: string,
        type: string,
        label: string
    ): FieldType {
        return {
            aggregatable: true,
            autoNumber: true,
            byteLength: 123,
            calculated: true,
            calculatedFormula: '',
            cascadeDelete: true,
            caseSensitive: true,
            compoundFieldName: '',
            controllerName: '',
            createable: true,
            custom: true,
            defaultValue: '',
            defaultValueFormula: '',
            defaultedOnCreate: true,
            dependentPicklist: true,
            deprecatedAndHidden: true,
            digits: 123,
            displayLocationInDecimal: true,
            encrypted: true,
            externalId: true,
            extraTypeInfo: '',
            filterable: true,
            filteredLookupInfo: {},
            groupable: true,
            highScaleNumber: true,
            htmlFormatted: true,
            idLookup: true,
            inlineHelpText: '',
            label: label,
            length: 123,
            mask: '',
            maskType: '',
            name: apiName,
            nameField: true,
            namePointing: true,
            nillable: true,
            permissionable: true,
            picklistValues: [],
            precision: 123,
            queryByDistance: true,
            referenceTargetField: {},
            referenceTo: [],
            relationshipName: '',
            relationshipOrder: 0,
            restrictedDelete: true,
            restrictedPicklist: true,
            scale: 123,
            soapType: 'string',
            sortable: true,
            type: type,
            unique: true,
            updateable: true,
            writeRequiresMasterRead: true
        };
    }
});
