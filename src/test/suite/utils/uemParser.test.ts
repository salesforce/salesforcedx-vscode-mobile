/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import { UEMParser } from '../../../utils/uemParser';

suite('UEM Parser Test Suite', () => {
    test('Empty object returns empty array', async () => {
        const sObjects = UEMParser.findSObjects({});
        assert.equal(sObjects.length, 0);
    });

    test('Object with a target field returns array size of one', async () => {
        const landingPage = {
            definition: 'mcf/list',
            properties: {
                objectApiName: 'foo'
            }
        };

        const sObjects = UEMParser.findSObjects(landingPage);
        assert.equal(sObjects.length, 1);
        assert.equal(sObjects[0], 'foo');
    });

    test('Nested object returns all values of the target field', async () => {
        const landingPage = {
            definition: 'mcf/list',
            properties: {
                objectApiName: 'foo'
            },
            nested: {
                definition: 'mcf/list',
                properties: {
                    objectApiName: 'bar'
                }
            }
        };

        const sObjects = UEMParser.findSObjects(landingPage);
        assert.equal(sObjects.length, 2);
        assert.equal(sObjects[0], 'foo');
        assert.equal(sObjects[1], 'bar');
    });

    test('Duplicate field values are omitted', async () => {
        const landingPage = {
            definition: 'mcf/list',
            properties: {
                objectApiName: 'foo'
            },
            nested: {
                definition: 'mcf/list',
                properties: {
                    objectApiName: 'bar'
                },
                anotherNested: {
                    definition: 'mcf/list',
                    properties: {
                        objectApiName: 'bar'
                    }
                }
            }
        };

        const sObjects = UEMParser.findSObjects(landingPage);
        assert.equal(sObjects.length, 2);
        assert.equal(sObjects[0], 'foo');
        assert.equal(sObjects[1], 'bar');
    });

    test('Duplicat field values are omitted', async () => {
        const landingPage = {
            definition: 'mcf/list',
            properties: {
                objectApiName: 'plain'
            },
            nested: {
                definition: 'mcf/timedList',
                properties: {
                    objectApiName: 'timed'
                },
                anotherNested: {
                    definition: 'mcf/genericLists',
                    properties: {
                        objectApiName: 'generic'
                    }
                }
            }
        };

        const sObjects = UEMParser.findSObjects(landingPage);
        assert.equal(sObjects.length, 3);
        assert.equal(sObjects[0], 'plain');
        assert.equal(sObjects[1], 'timed');
        assert.equal(sObjects[2], 'generic');
    });
});
