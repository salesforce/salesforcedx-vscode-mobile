/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import { CodeBuilder } from '../../../utils/codeBuilder';
import { Uri } from 'vscode';
import { afterEach, beforeEach } from 'mocha';

suite('CodeBuilder Test Suite', () => {
    var extensionUri = Uri.parse('file:///tmp/');

    beforeEach(function () {});

    afterEach(function () {
        sinon.restore();
    });

    test('Template variables are populated in constructor', async () => {
        const codeBuilder = new CodeBuilder(extensionUri, 'Account', [
            'field1'
        ]);
        const templateVars = codeBuilder.templateVariables;

        assert.equal(
            templateVars['TEMPLATE_CREATE_LWC_LABEL'],
            'LWC for creating a/an Account instance.'
        );
        assert.equal(
            templateVars['TEMPLATE_EDIT_LWC_LABEL'],
            'LWC for editing a/an Account instance.'
        );
        assert.equal(
            templateVars['TEMPLATE_VIEW_LWC_LABEL'],
            'LWC for viewing a/an Account instance.'
        );

        assert.equal(templateVars['TEMPLATE_FIELDS'], 'FIELD1_FIELD, ');
        assert.ok(
            templateVars['TEMPLATE_IMPORTS'].includes(
                'import FIELD1_FIELD from "@salesforce/schema/Account.field1";'
            )
        );
        assert.ok(
            templateVars[
                'TEMPLATE_LIGHTNING_INPUT_CREATE_FIELDS_HTML'
            ].includes(
                '<lightning-input-field field-name={field1Field} value={field1}></lightning-input-field>'
            )
        );

        assert.ok(
            templateVars['TEMPLATE_LIGHTNING_INPUT_EDIT_FIELDS_HTML'].includes(
                '<lightning-input-field field-name={field1Field}></lightning-input-field>'
            )
        );

        assert.ok(
            templateVars['TEMPLATE_VARIABLES'].includes(
                'field1Field = FIELD1_FIELD;'
            )
        );

        assert.ok(
            templateVars['TEMPLATE_VARIABLE_ASSIGNMENTS'].includes(
                'field1 = "";'
            )
        );
    });
});
