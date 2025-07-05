/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import { CodeBuilder } from '../../../src/utils/codeBuilder';
import { Uri } from 'vscode';
import { afterEach, beforeEach } from 'mocha';
import * as fs from 'fs';
import * as path from 'path';
import { CompactLayoutField } from '../../../src/utils/orgUtils';
import mock from 'mock-fs';

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
        // Don't restore mock here - let each test handle it
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
        
        // Test that mock file system is working
        try {
            const testContent = fs.readFileSync('/tmp/resources/templates/quickAction.xml', 'utf8');
            assert.ok(testContent.includes('///TEMPLATE_LWC_NAME///'), 'Mock file system should contain template content');
        } catch (err) {
            console.log('Failed to read mock file:', err);
            throw err;
        }
        
        const getRecordedFiles = result[0];
        const compactLayoutFields = buildTestCompactLayoutFields();
        const codeBuilder = new CodeBuilder(
            extensionUri,
            'Account',
            compactLayoutFields
        );

        await codeBuilder.generateView();
        
        // Check if directories exist in mock
        const directories = [
            '/tmp/force-app/main/default/lwc',
            '/tmp/force-app/main/default/quickActions'
        ];
        
        directories.forEach(dir => {
            try {
                const stats = fs.statSync(dir);
                console.log(`Directory exists: ${dir} (isDirectory: ${stats.isDirectory()})`);
            } catch (err) {
                console.log(`Directory does not exist: ${dir}`);
            }
        });
        
        // Read the written files from the mock file system
        const writtenFiles: any[] = [];
        const expectedFiles = [
            // Absolute paths
            '/tmp/force-app/main/default/lwc/viewAccountRecord/viewAccountRecord.css',
            '/tmp/force-app/main/default/lwc/viewAccountRecord/viewAccountRecord.html',
            '/tmp/force-app/main/default/lwc/viewAccountRecord/viewAccountRecord.js',
            '/tmp/force-app/main/default/lwc/viewAccountRecord/viewAccountRecord.js-meta.xml',
            '/tmp/force-app/main/default/quickActions/Account.view.quickAction-meta.xml',
            // Relative paths
            'force-app/main/default/lwc/viewAccountRecord/viewAccountRecord.css',
            'force-app/main/default/lwc/viewAccountRecord/viewAccountRecord.html',
            'force-app/main/default/lwc/viewAccountRecord/viewAccountRecord.js',
            'force-app/main/default/lwc/viewAccountRecord/viewAccountRecord.js-meta.xml',
            'force-app/main/default/quickActions/Account.view.quickAction-meta.xml'
        ];
        
        expectedFiles.forEach(filePath => {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                writtenFiles.push({
                    filePath: filePath,
                    data: content
                });
            } catch (err) {
                // File not found in mock
            }
        });
        
        assert.equal(writtenFiles.length, 5);

        // Test that every file written out had all template values replaced
        writtenFiles.forEach((file: any) => {
            assert.ok(
                !file.data.includes('///'),
                `All values should have been replaced in file ${file.filePath}!`
            );
        });
        
        // Restore mock after we're done with it
        mock.restore();
    });

    test('Generate view lwc and quick action', async () => {
        var result = stubFileSystem([
            SAMPLE_CSS_DATA,
            SAMPLE_HTML_DATA,
            SAMPLE_JS_DATA,
            SAMPLE_XML_DATA,
            SAMPLE_QA_DATA
        ]);
        
        const compactLayoutFields = buildTestCompactLayoutFields();
        const codeBuilder = new CodeBuilder(
            extensionUri,
            'Account',
            compactLayoutFields
        );

        await codeBuilder.generateView();
        
        // Read the written files from the mock file system
        const writtenFiles: any[] = [];
        const expectedFiles = [
            // Absolute paths
            '/tmp/force-app/main/default/lwc/viewAccountRecord/viewAccountRecord.css',
            '/tmp/force-app/main/default/lwc/viewAccountRecord/viewAccountRecord.html',
            '/tmp/force-app/main/default/lwc/viewAccountRecord/viewAccountRecord.js',
            '/tmp/force-app/main/default/lwc/viewAccountRecord/viewAccountRecord.js-meta.xml',
            '/tmp/force-app/main/default/quickActions/Account.view.quickAction-meta.xml',
            // Relative paths
            'force-app/main/default/lwc/viewAccountRecord/viewAccountRecord.css',
            'force-app/main/default/lwc/viewAccountRecord/viewAccountRecord.html',
            'force-app/main/default/lwc/viewAccountRecord/viewAccountRecord.js',
            'force-app/main/default/lwc/viewAccountRecord/viewAccountRecord.js-meta.xml',
            'force-app/main/default/quickActions/Account.view.quickAction-meta.xml'
        ];
        
        expectedFiles.forEach(filePath => {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                writtenFiles.push({
                    filePath: filePath,
                    data: content
                });
            } catch (err) {
                // File not found in mock
            }
        });
        
        assert.equal(writtenFiles.length, 5);

        // CSS file
        var dirPath = 'force-app/main/default/lwc/viewAccountRecord';
        assert.equal(
            writtenFiles[0].filePath,
            path.normalize(`${dirPath}/viewAccountRecord.css`)
        );
        assert.equal(writtenFiles[0].data, SAMPLE_CSS_DATA);

        // HTML file
        assert.equal(
            writtenFiles[1].filePath,
            path.normalize(`${dirPath}/viewAccountRecord.html`)
        );
        assert.equal(writtenFiles[1].data, SAMPLE_HTML_DATA);

        // JS file
        assert.equal(
            writtenFiles[2].filePath,
            path.normalize(`${dirPath}/viewAccountRecord.js`)
        );
        assert.equal(writtenFiles[2].data, SAMPLE_JS_DATA);

        // XML file
        assert.equal(
            writtenFiles[3].filePath,
            path.normalize(`${dirPath}/viewAccountRecord.js-meta.xml`)
        );
        assert.equal(writtenFiles[3].data, SAMPLE_XML_DATA);

        // QA file
        assert.equal(
            writtenFiles[4].filePath,
            path.normalize(
                'force-app/main/default/quickActions/Account.view.quickAction-meta.xml'
            )
        );
        assert.equal(writtenFiles[4].data, SAMPLE_QA_DATA);
        
        // Restore mock after we're done with it
        mock.restore();
    });

    test('Generate edit lwc and quick action', async () => {
        var result = stubFileSystem([
            SAMPLE_CSS_DATA,
            SAMPLE_HTML_DATA,
            SAMPLE_JS_DATA,
            SAMPLE_XML_DATA,
            SAMPLE_QA_DATA
        ]);
        
        const compactLayoutFields = buildTestCompactLayoutFields();
        const codeBuilder = new CodeBuilder(
            extensionUri,
            'Account',
            compactLayoutFields
        );

        await codeBuilder.generateEdit();
        
        // Read the written files from the mock file system
        const writtenFiles: any[] = [];
        const expectedFiles = [
            // Absolute paths
            '/tmp/force-app/main/default/lwc/editAccountRecord/editAccountRecord.css',
            '/tmp/force-app/main/default/lwc/editAccountRecord/editAccountRecord.html',
            '/tmp/force-app/main/default/lwc/editAccountRecord/editAccountRecord.js',
            '/tmp/force-app/main/default/lwc/editAccountRecord/editAccountRecord.js-meta.xml',
            '/tmp/force-app/main/default/quickActions/Account.edit.quickAction-meta.xml',
            // Relative paths
            'force-app/main/default/lwc/editAccountRecord/editAccountRecord.css',
            'force-app/main/default/lwc/editAccountRecord/editAccountRecord.html',
            'force-app/main/default/lwc/editAccountRecord/editAccountRecord.js',
            'force-app/main/default/lwc/editAccountRecord/editAccountRecord.js-meta.xml',
            'force-app/main/default/quickActions/Account.edit.quickAction-meta.xml'
        ];
        
        expectedFiles.forEach(filePath => {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                writtenFiles.push({
                    filePath: filePath,
                    data: content
                });
            } catch (err) {
                // File not found in mock
            }
        });
        
        assert.equal(writtenFiles.length, 5);

        // CSS file
        var dirPath = 'force-app/main/default/lwc/editAccountRecord';
        assert.equal(
            writtenFiles[0].filePath,
            path.normalize(`${dirPath}/editAccountRecord.css`)
        );
        assert.equal(writtenFiles[0].data, SAMPLE_CSS_DATA);

        // HTML file
        assert.equal(
            writtenFiles[1].filePath,
            path.normalize(`${dirPath}/editAccountRecord.html`)
        );
        assert.equal(writtenFiles[1].data, SAMPLE_HTML_DATA);

        // JS file
        assert.equal(
            writtenFiles[2].filePath,
            path.normalize(`${dirPath}/editAccountRecord.js`)
        );
        assert.equal(writtenFiles[2].data, SAMPLE_JS_DATA);

        // XML file
        assert.equal(
            writtenFiles[3].filePath,
            path.normalize(`${dirPath}/editAccountRecord.js-meta.xml`)
        );
        assert.equal(writtenFiles[3].data, SAMPLE_XML_DATA);

        // QA file
        assert.equal(
            writtenFiles[4].filePath,
            path.normalize(
                'force-app/main/default/quickActions/Account.edit.quickAction-meta.xml'
            )
        );
        assert.equal(writtenFiles[4].data, SAMPLE_QA_DATA);
        
        // Restore mock after we're done with it
        mock.restore();
    });

    test('Generate create lwc and quick action', async () => {
        var result = stubFileSystem([
            SAMPLE_CSS_DATA,
            SAMPLE_HTML_DATA,
            SAMPLE_JS_DATA,
            SAMPLE_XML_DATA,
            SAMPLE_QA_DATA
        ]);
        
        const compactLayoutFields = buildTestCompactLayoutFields();
        const codeBuilder = new CodeBuilder(
            extensionUri,
            'Account',
            compactLayoutFields
        );

        await codeBuilder.generateCreate();
        
        // Read the written files from the mock file system
        const writtenFiles: any[] = [];
        const expectedFiles = [
            // Absolute paths
            '/tmp/force-app/main/default/lwc/createAccountRecord/createAccountRecord.css',
            '/tmp/force-app/main/default/lwc/createAccountRecord/createAccountRecord.html',
            '/tmp/force-app/main/default/lwc/createAccountRecord/createAccountRecord.js',
            '/tmp/force-app/main/default/lwc/createAccountRecord/createAccountRecord.js-meta.xml',
            '/tmp/force-app/main/default/quickActions/Account.create.quickAction-meta.xml',
            // Relative paths
            'force-app/main/default/lwc/createAccountRecord/createAccountRecord.css',
            'force-app/main/default/lwc/createAccountRecord/createAccountRecord.html',
            'force-app/main/default/lwc/createAccountRecord/createAccountRecord.js',
            'force-app/main/default/lwc/createAccountRecord/createAccountRecord.js-meta.xml',
            'force-app/main/default/quickActions/Account.create.quickAction-meta.xml'
        ];
        
        expectedFiles.forEach(filePath => {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                writtenFiles.push({
                    filePath: filePath,
                    data: content
                });
            } catch (err) {
                // File not found in mock
            }
        });
        
        assert.equal(writtenFiles.length, 5);

        // CSS file
        var dirPath = 'force-app/main/default/lwc/createAccountRecord';
        assert.equal(
            writtenFiles[0].filePath,
            path.normalize(`${dirPath}/createAccountRecord.css`)
        );
        assert.equal(writtenFiles[0].data, SAMPLE_CSS_DATA);

        // HTML file
        assert.equal(
            writtenFiles[1].filePath,
            path.normalize(`${dirPath}/createAccountRecord.html`)
        );
        assert.equal(writtenFiles[1].data, SAMPLE_HTML_DATA);

        // JS file
        assert.equal(
            writtenFiles[2].filePath,
            path.normalize(`${dirPath}/createAccountRecord.js`)
        );
        assert.equal(writtenFiles[2].data, SAMPLE_JS_DATA);

        // XML file
        assert.equal(
            writtenFiles[3].filePath,
            path.normalize(`${dirPath}/createAccountRecord.js-meta.xml`)
        );
        assert.equal(writtenFiles[3].data, SAMPLE_XML_DATA);

        // QA file
        assert.equal(
            writtenFiles[4].filePath,
            path.normalize(
                'force-app/main/default/quickActions/Account.create.quickAction-meta.xml'
            )
        );
        assert.equal(writtenFiles[4].data, SAMPLE_QA_DATA);
        
        // Restore mock after we're done with it
        mock.restore();
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
     * @returns 2-item array where index 0 holds a function to get recorded files,
     * and index 1 holds a dummy mkdirStub object for compatibility.
     */
    function stubFileSystem(fileContent: string[]): [() => any[], { callCount: number }] {
        /** Use mock-fs for file reads and to capture written files */
        const mockFsConfig: any = {
            '/tmp/resources/templates/viewRecord/viewRecord.css': fileContent[0],
            '/tmp/resources/templates/viewRecord/viewRecord.html': fileContent[1],
            '/tmp/resources/templates/viewRecord/viewRecord.js': fileContent[2],
            '/tmp/resources/templates/viewRecord/viewRecord.js-meta.xml': fileContent[3],
            '/tmp/resources/templates/editRecord/editRecord.css': fileContent[0],
            '/tmp/resources/templates/editRecord/editRecord.html': fileContent[1],
            '/tmp/resources/templates/editRecord/editRecord.js': fileContent[2],
            '/tmp/resources/templates/editRecord/editRecord.js-meta.xml': fileContent[3],
            '/tmp/resources/templates/createRecord/createRecord.css': fileContent[0],
            '/tmp/resources/templates/createRecord/createRecord.html': fileContent[1],
            '/tmp/resources/templates/createRecord/createRecord.js': fileContent[2],
            '/tmp/resources/templates/createRecord/createRecord.js-meta.xml': fileContent[3],
            '/tmp/resources/templates/quickAction.xml': fileContent[4],
            // Add directories for CodeBuilder to write to (both absolute and relative)
            '/tmp/force-app/main/default/lwc': {},
            '/tmp/force-app/main/default/quickActions': {},
            'force-app/main/default/lwc': {},
            'force-app/main/default/quickActions': {}
        };
        
        mock(mockFsConfig);

        // Return a function to get recorded files after the test runs
        return [
            () => {
                const recordedFiles: any = [];
                
                // Read all written files from the mock file system
                const writtenFiles = [
                    '/tmp/force-app/main/default/lwc/viewAccountRecord/viewAccountRecord.css',
                    '/tmp/force-app/main/default/lwc/viewAccountRecord/viewAccountRecord.html',
                    '/tmp/force-app/main/default/lwc/viewAccountRecord/viewAccountRecord.js',
                    '/tmp/force-app/main/default/lwc/viewAccountRecord/viewAccountRecord.js-meta.xml',
                    '/tmp/force-app/main/default/quickActions/Account.view.quickAction-meta.xml',
                    '/tmp/force-app/main/default/lwc/editAccountRecord/editAccountRecord.css',
                    '/tmp/force-app/main/default/lwc/editAccountRecord/editAccountRecord.html',
                    '/tmp/force-app/main/default/lwc/editAccountRecord/editAccountRecord.js',
                    '/tmp/force-app/main/default/lwc/editAccountRecord/editAccountRecord.js-meta.xml',
                    '/tmp/force-app/main/default/quickActions/Account.edit.quickAction-meta.xml',
                    '/tmp/force-app/main/default/lwc/createAccountRecord/createAccountRecord.css',
                    '/tmp/force-app/main/default/lwc/createAccountRecord/createAccountRecord.html',
                    '/tmp/force-app/main/default/lwc/createAccountRecord/createAccountRecord.js',
                    '/tmp/force-app/main/default/lwc/createAccountRecord/createAccountRecord.js-meta.xml',
                    '/tmp/force-app/main/default/quickActions/Account.create.quickAction-meta.xml'
                ];
                
                writtenFiles.forEach(filePath => {
                    try {
                        const content = fs.readFileSync(filePath, 'utf8');
                        recordedFiles.push({
                            filePath: filePath,
                            data: content
                        });
                    } catch (err) {
                        // File doesn't exist, skip it
                    }
                });
                
                return recordedFiles;
            },
            { callCount: 5 } // Dummy mkdirStub for compatibility
        ];
    }
});
