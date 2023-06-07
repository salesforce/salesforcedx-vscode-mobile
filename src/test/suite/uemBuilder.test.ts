/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import { UEMBuilder } from '../../landingPage/uemBuilder';
import { Field } from '../../landingPage/orgUtils';

suite('UEM Builder Test Suite', () => {
    test('Build returns default with no cards', async () => {
        const builder = new UEMBuilder();

        const uem = builder.build();

        let cards =
            uem.view.regions.components.components[0].regions.components
                .components;
        assert.equal(cards.length, 0);
    });

    test('Global Action card is present', async () => {
        const builder = new UEMBuilder();

        builder.addGlobalActionCard();
        const uem = builder.build();
        let cards =
            uem.view.regions.components.components[0].regions.components
                .components;
        assert.equal(cards.length, 1);
        assert.equal(cards[0].name, 'global_actions');
    });

    test('Record List card is built correctly', async () => {
        const builder = new UEMBuilder();

        const fieldsToDisplay: Field[] = [
            {
                apiName: 'City',
                label: 'City',
                type: 'string'
            },
            {
                apiName: 'State',
                label: 'State',
                type: 'string'
            },
            {
                apiName: 'Zip',
                label: 'Zip',
                type: 'string'
            }
        ];
        builder.addRecordListCard('SomeObject', 'LabelPlural', fieldsToDisplay);
        const json = builder.build();

        const recordListCard =
            json.view.regions.components.components[0].regions.components
                .components[0];
        const recordListUEM = recordListCard.regions.components.components[0];
        // ensure we added a card with a list component
        assert.equal(recordListUEM.definition, 'mcf/list');
        assert.equal(recordListUEM.name, 'someobject_list');
        assert.equal(recordListUEM.label, 'LabelPlural');
        assert.equal(recordListUEM.properties.size, 3);
        assert.equal(recordListUEM.properties.objectApiName, 'SomeObject');

        const fields = recordListUEM.properties.fields;
        assert.equal(fields.City, 'StringValue');
        assert.equal(fields.State, 'StringValue');
        assert.equal(fields.Zip, 'StringValue');

        const fieldMap = recordListUEM.properties.fieldMap;
        assert.equal(fieldMap.mainField, 'City');
        assert.equal(fieldMap.subField1, 'State');
        assert.equal(fieldMap.subField2, 'Zip');

        const rowMap = recordListUEM.regions.components.components[0];
        assert.equal(rowMap.definition, 'mcf/recordRow');
        assert.equal(rowMap.name, 'someobject_row');
        assert.equal(rowMap.label, 'SomeObject Row');
    });
});
