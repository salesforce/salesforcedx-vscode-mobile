/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import { suite, test, afterEach } from 'mocha';
import { transformYamlToObject } from '../../utils/yamlParser';

suite('YamlParser Test Suite', () => {
    afterEach(function () {
        sinon.restore();
    });

    test('Parse valid yaml correctly', () => {
        const yamlObject = transformYamlToObject(
            `
            allowed:
                Lightning:
                    label: "Lightning Experience"
                    includeWithStandard: true
                    sort: 1
            values:
                "aura:component":
                    - Standard
                "forceCommunity:notifications":
                    - Lightning
                    - Communities
                    - Mobile
                "lightning:accordion":
                    - Lightning
                    - Communities
                    - Mobile
                    - Out
                    - Standalone
                    - MobileOffline
                "lightning:alert":
                    - Lightning
            `,
            'values'
        );
        assert.equal(Object.keys(yamlObject).length, 4);
    });

    test('Throws when designated level can not be found in yaml', () => {
        assert.throws(() => {
            transformYamlToObject(
                `
                allowed:
                    Lightning:
                        label: "Lightning Experience"
                        includeWithStandard: true
                        sort: 1
                `,
                'values'
            );
        });
    });

    test('Throws when properties values are not in correct format can not be found in yaml', () => {
        assert.throws(() => {
            transformYamlToObject(
                `
                allowed:
                Lightning:
                    label: "Lightning Experience"
                    includeWithStandard: true
                    sort: 1
                values:
                    "aura:component":
                        - 999
                    "forceCommunity:notifications":
                    "lightning:accordion":
                        - Lightning
                        - Communities
                        - Mobile
                        - Out
                        - Standalone
                        - MobileOffline
                    "lightning:alert":
                        - Lightning
                `,
                'values'
            );
        });
    });
});
