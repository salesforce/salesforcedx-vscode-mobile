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
import * as fs from 'fs';
import * as path from 'path';
import { CompactLayoutField } from '../../../utils/orgUtils';

suite('CodeBuilder Test Suite', () => {
    var extensionUri = Uri.parse('file:///tmp/');

    const SAMPLE_CSS_DATA = 'css content';
    const SAMPLE_HTML_DATA = 'html content';
    const SAMPLE_JS_DATA = 'js content';
    const SAMPLE_XML_DATA = 'xml content';
    const SAMPLE_QA_DATA = 'qa content';

    beforeEach(function () {});

    afterEach(function () {
        sinon.restore();
    });

    test('All values substituted before writing', async () => {
        // we will test the qa file with content that includes all template fields. Since all template fields
        // follow the format of "///TEMPLATE_XYZ///" we will just ensure that no "///" value exists in the file
        // which proves that all placeholders were replaced.
        const allTemplateFields = [
            CodeBuilder.TEMPLATE_CREATE_LWC_LABEL,
            CodeBuilder.TEMPLATE_EDIT_LWC_LABEL,
            CodeBuilder.TEMPLATE_FIELDS,
            CodeBuilder.TEMPLATE_IMPORTS,
            CodeBuilder.TEMPLATE_LIGHTNING_INPUT_CREATE_FIELDS_HTML,
            CodeBuilder.TEMPLATE_LIGHTNING_INPUT_EDIT_FIELDS_HTML,
            CodeBuilder.TEMPLATE_OBJECT_API_NAME,
            CodeBuilder.TEMPLATE_VARIABLES,
            CodeBuilder.TEMPLATE_VARIABLE_ASSIGNMENTS,
            CodeBuilder.TEMPLATE_VIEW_LWC_LABEL
        ];

        // but only these are substituted in a qa
        const allQaTemplateFields = [
            CodeBuilder.TEMPLATE_LWC_NAME,
            CodeBuilder.TEMPLATE_QUICK_ACTION_ICON,
            CodeBuilder.TEMPLATE_QUICK_ACTION_LABEL
        ];

        var allTemplateFieldsContent = '';
        allTemplateFields.forEach((field) => {
            allTemplateFieldsContent += `///${field}///\n`;
        });

        var allQaTemplateFieldsContent = allTemplateFieldsContent;
        allQaTemplateFields.forEach((field) => {
            allQaTemplateFieldsContent += `///${field}///\n`;
        });

        var result = stubFileSystem([
            allTemplateFieldsContent,
            allTemplateFieldsContent,
            allTemplateFieldsContent,
            allTemplateFieldsContent,
            allQaTemplateFieldsContent
        ]);
        const recordedFiles = result[0];
        const compactLayoutFields = buildTestCompactLayoutFields();
        const codeBuilder = new CodeBuilder(
            extensionUri,
            'Account',
            compactLayoutFields
        );

        await codeBuilder.generateView();
        assert.equal(recordedFiles.length, 5);

        // Test that every file written out had all template values replaced
        recordedFiles.forEach((file: any) => {
            assert.ok(
                !file.data.includes('///'),
                `All values should have been replaced in file ${file.filePath}!`
            );
        });
    });

    test('Generate view lwc and quick action', async () => {
        var result = stubFileSystem([
            SAMPLE_CSS_DATA,
            SAMPLE_HTML_DATA,
            SAMPLE_JS_DATA,
            SAMPLE_XML_DATA,
            SAMPLE_QA_DATA
        ]);
        const recordedFiles = result[0];
        const mkdirStub = result[1];

        const compactLayoutFields = buildTestCompactLayoutFields();
        const codeBuilder = new CodeBuilder(
            extensionUri,
            'Account',
            compactLayoutFields
        );

        await codeBuilder.generateView();
        assert.equal(recordedFiles.length, 5);
        assert.equal(mkdirStub.callCount, 5); // for every file in test case

        // CSS file
        var dirPath = 'force-app/main/default/lwc/viewAccountRecord';
        assert.equal(
            recordedFiles[0].filePath,
            path.normalize(`${dirPath}/viewAccountRecord.css`)
        );
        assert.equal(recordedFiles[0].data, SAMPLE_CSS_DATA);

        // HTML file
        assert.equal(
            recordedFiles[1].filePath,
            path.normalize(`${dirPath}/viewAccountRecord.html`)
        );
        assert.equal(recordedFiles[1].data, SAMPLE_HTML_DATA);

        // JS file
        assert.equal(
            recordedFiles[2].filePath,
            path.normalize(`${dirPath}/viewAccountRecord.js`)
        );
        assert.equal(recordedFiles[2].data, SAMPLE_JS_DATA);

        // XML file
        assert.equal(
            recordedFiles[3].filePath,
            path.normalize(`${dirPath}/viewAccountRecord.js-meta.xml`)
        );
        assert.equal(recordedFiles[3].data, SAMPLE_XML_DATA);

        // QA file
        assert.equal(
            recordedFiles[4].filePath,
            path.normalize(
                'force-app/main/default/quickActions/Account.view.quickAction-meta.xml'
            )
        );
        assert.equal(recordedFiles[4].data, SAMPLE_QA_DATA);
    });

    test('Generate edit lwc and quick action', async () => {
        var result = stubFileSystem([
            SAMPLE_CSS_DATA,
            SAMPLE_HTML_DATA,
            SAMPLE_JS_DATA,
            SAMPLE_XML_DATA,
            SAMPLE_QA_DATA
        ]);
        const recordedFiles = result[0];
        const mkdirStub = result[1];

        const compactLayoutFields = buildTestCompactLayoutFields();
        const codeBuilder = new CodeBuilder(
            extensionUri,
            'Account',
            compactLayoutFields
        );

        await codeBuilder.generateEdit();
        assert.equal(recordedFiles.length, 5);
        assert.equal(mkdirStub.callCount, 5); // for every file in test case

        // CSS file
        var dirPath = 'force-app/main/default/lwc/editAccountRecord';
        assert.equal(
            recordedFiles[0].filePath,
            path.normalize(`${dirPath}/editAccountRecord.css`)
        );
        assert.equal(recordedFiles[0].data, SAMPLE_CSS_DATA);

        // HTML file
        assert.equal(
            recordedFiles[1].filePath,
            path.normalize(`${dirPath}/editAccountRecord.html`)
        );
        assert.equal(recordedFiles[1].data, SAMPLE_HTML_DATA);

        // JS file
        assert.equal(
            recordedFiles[2].filePath,
            path.normalize(`${dirPath}/editAccountRecord.js`)
        );
        assert.equal(recordedFiles[2].data, SAMPLE_JS_DATA);

        // XML file
        assert.equal(
            recordedFiles[3].filePath,
            path.normalize(`${dirPath}/editAccountRecord.js-meta.xml`)
        );
        assert.equal(recordedFiles[3].data, SAMPLE_XML_DATA);

        // QA file
        assert.equal(
            recordedFiles[4].filePath,
            path.normalize(
                'force-app/main/default/quickActions/Account.edit.quickAction-meta.xml'
            )
        );
        assert.equal(recordedFiles[4].data, SAMPLE_QA_DATA);
    });

    test('Generate create lwc and quick action', async () => {
        var result = stubFileSystem([
            SAMPLE_CSS_DATA,
            SAMPLE_HTML_DATA,
            SAMPLE_JS_DATA,
            SAMPLE_XML_DATA,
            SAMPLE_QA_DATA
        ]);
        const recordedFiles = result[0];
        const mkdirStub = result[1];

        const compactLayoutFields = buildTestCompactLayoutFields();
        const codeBuilder = new CodeBuilder(
            extensionUri,
            'Account',
            compactLayoutFields
        );

        await codeBuilder.generateCreate();
        assert.equal(recordedFiles.length, 5);
        assert.equal(mkdirStub.callCount, 5); // for every file in test case

        // CSS file
        var dirPath = 'force-app/main/default/lwc/createAccountRecord';
        assert.equal(
            recordedFiles[0].filePath,
            path.normalize(`${dirPath}/createAccountRecord.css`)
        );
        assert.equal(recordedFiles[0].data, SAMPLE_CSS_DATA);

        // HTML file
        assert.equal(
            recordedFiles[1].filePath,
            path.normalize(`${dirPath}/createAccountRecord.html`)
        );
        assert.equal(recordedFiles[1].data, SAMPLE_HTML_DATA);

        // JS file
        assert.equal(
            recordedFiles[2].filePath,
            path.normalize(`${dirPath}/createAccountRecord.js`)
        );
        assert.equal(recordedFiles[2].data, SAMPLE_JS_DATA);

        // XML file
        assert.equal(
            recordedFiles[3].filePath,
            path.normalize(`${dirPath}/createAccountRecord.js-meta.xml`)
        );
        assert.equal(recordedFiles[3].data, SAMPLE_XML_DATA);

        // QA file
        assert.equal(
            recordedFiles[4].filePath,
            path.normalize(
                'force-app/main/default/quickActions/Account.create.quickAction-meta.xml'
            )
        );
        assert.equal(recordedFiles[4].data, SAMPLE_QA_DATA);
    });

    test('Field names are populated in constructor', () => {
        const compactLayoutFields = buildTestCompactLayoutFields();
        const codeBuilder = new CodeBuilder(
            extensionUri,
            'Account',
            compactLayoutFields
        );

        const fieldNames = codeBuilder.fieldNames;
        assert.equal(fieldNames.length, 1);
        assert.equal(fieldNames[0], 'field1');
    });

    test('Template variables are populated in constructor', () => {
        const compactLayoutFields = buildTestCompactLayoutFields();
        const codeBuilder = new CodeBuilder(
            extensionUri,
            'Account',
            compactLayoutFields
        );

        const templateVars = codeBuilder.templateVariables;

        assert.equal(
            templateVars[CodeBuilder.TEMPLATE_CREATE_LWC_LABEL],
            'LWC for creating a/an Account instance.'
        );
        assert.equal(
            templateVars[CodeBuilder.TEMPLATE_EDIT_LWC_LABEL],
            'LWC for editing a/an Account instance.'
        );
        assert.equal(
            templateVars[CodeBuilder.TEMPLATE_VIEW_LWC_LABEL],
            'LWC for viewing a/an Account instance.'
        );

        assert.equal(
            templateVars[CodeBuilder.TEMPLATE_FIELDS],
            'FIELD1_FIELD, '
        );
        assert.ok(
            templateVars[CodeBuilder.TEMPLATE_IMPORTS].includes(
                'import FIELD1_FIELD from "@salesforce/schema/Account.field1";'
            )
        );
        assert.ok(
            templateVars[
                CodeBuilder.TEMPLATE_LIGHTNING_INPUT_CREATE_FIELDS_HTML
            ].includes(
                '<lightning-input-field field-name={field1Field} value={field1}></lightning-input-field>'
            )
        );

        assert.ok(
            templateVars[
                CodeBuilder.TEMPLATE_LIGHTNING_INPUT_EDIT_FIELDS_HTML
            ].includes(
                '<lightning-input-field field-name={field1Field}></lightning-input-field>'
            )
        );

        assert.ok(
            templateVars[CodeBuilder.TEMPLATE_VARIABLES].includes(
                'field1Field = FIELD1_FIELD;'
            )
        );

        assert.ok(
            templateVars[CodeBuilder.TEMPLATE_VARIABLE_ASSIGNMENTS].includes(
                'field1 = "";'
            )
        );
    });

    function buildTestCompactLayoutFields() {
        const compactLayoutFields: CompactLayoutField[] = [];
        compactLayoutFields.push({
            editableForNew: true,
            editableForUpdate: true,
            label: 'Name',
            layoutComponents: [
                {
                    value: 'field1'
                }
            ]
        });
        return compactLayoutFields;
    }

    /**
     * Helper function to set up stubbing of the filesystem.
     *
     * @returns 2-item array where index 0 holds return values for invocations to
     * the writeFileSync stub, and index 1 holds the mkdirSync stub.
     */
    function stubFileSystem(fileContent: string[]) {
        /** Stub all file system operations and ensure things are copied and calls are made */
        // mock the reads
        const readFileStub = sinon.stub(fs, 'readFileSync');
        readFileStub.onCall(0).returns(fileContent[0]);
        readFileStub.onCall(1).returns(fileContent[1]);
        readFileStub.onCall(2).returns(fileContent[2]);
        readFileStub.onCall(3).returns(fileContent[3]);
        readFileStub.onCall(4).returns(fileContent[4]);

        // mock the writes
        sinon.stub(fs, 'existsSync').returns(false);
        const mkdirStub = sinon.stub(fs, 'mkdirSync');

        // capture written out content
        const writeStub = sinon.stub(fs, 'writeFileSync');
        var recordedFiles: any = [];
        writeStub.callsFake((filePath, data, encoding) => {
            // store values of all invocations
            recordedFiles.push({
                filePath: filePath,
                data: data
            });
            assert.equal(encoding, 'utf8');
        });

        // Return the recorded invocations of file write operations as well as the mkdirStub itself.
        return [recordedFiles, mkdirStub];
    }
});
