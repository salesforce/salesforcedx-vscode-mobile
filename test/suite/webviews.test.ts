/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import { Uri, env } from 'vscode';
import { afterEach, beforeEach } from 'mocha';
import * as fs from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
    WebviewMessageHandler,
    WebviewProcessor
} from '../../src/webviews/processor';
import { TempProjectDirManager } from '../TestHelper';

suite('Webview Test Suite', () => {
    const extensionUri = Uri.parse('file:///tmp/testdir');

    beforeEach(function () {});

    afterEach(function () {
        sinon.restore();
    });

    test('Locale-specific file is returned if it exists', async () => {
        const languageStub = sinon.stub(env, 'language');
        languageStub.value('es');

        const fsExistStub = sinon.stub(fs, 'existsSync');
        fsExistStub.returns(true);

        const processor = new WebviewProcessor(extensionUri);
        const path = processor.getLocaleContentPath('test.html');

        assert.equal(path, 'test.es.html');
    });

    test('Defaults to english file if locale-specific file does not exist.', async () => {
        const languageStub = sinon.stub(env, 'language');
        languageStub.value('es');

        const fsExistStub = sinon.stub(fs, 'existsSync');
        fsExistStub.returns(false);

        const processor = new WebviewProcessor(extensionUri);
        const path = processor.getLocaleContentPath('test.html');

        assert.equal(path, 'test.html');
    });

    test('No responsive message handlers', async () => {
        const messageHandlerType = 'testType';
        const testMessage = 'A test messsage for someNonResponsiveType';
        const messageHandler: WebviewMessageHandler = {
            type: messageHandlerType,
            action: (_panel, _data) => {
                assert.fail('This callback should not have been executed.');
            }
        };
        const data = {
            type: 'someNonResponsiveType',
            testMessage: testMessage
        };

        const processor = new WebviewProcessor(extensionUri);
        const panel = processor.createWebviewPanel('someViewType', 'someTitle');
        processor.onWebviewReceivedMessage(data, panel, [messageHandler]);
        panel.dispose();
    });

    test('One message handler for web view, no callback', async () => {
        const messageHandlerType = 'testType';
        const testMessage = 'A test messsage for testType';
        const messageHandler: WebviewMessageHandler = {
            type: messageHandlerType,
            action: (_panel, data, callback) => {
                const testData = data as { type: string; testMessage: string };
                assert.ok(testData && testData.testMessage === testMessage);
                assert.ok(callback === undefined);
            }
        };
        const data = {
            type: messageHandlerType,
            testMessage: testMessage
        };

        const processor = new WebviewProcessor(extensionUri);
        const panel = processor.createWebviewPanel('someViewType', 'someTitle');
        processor.onWebviewReceivedMessage(data, panel, [messageHandler]);
        panel.dispose();
    });

    test('One message handler for web view, callback', async () => {
        const processor = new WebviewProcessor(extensionUri);
        const panel = processor.createWebviewPanel('someViewType', 'someTitle');
        const postMessageStub = sinon
            .stub(panel.webview, 'postMessage')
            .callsFake((message) => {
                return new Promise((resolve) => {
                    assert.ok(message.callbackId === callbackId);
                    assert.ok(
                        message.testResponseMessage === testResponseMessage
                    );
                    return resolve(true);
                });
            });
        const messageHandlerType = 'testType';
        const testMessage = 'A test messsage for testType';
        const testResponseMessage = 'A test response';
        const testResponseObj = { testResponseMessage };
        const callbackId = 13;
        const messageHandler: WebviewMessageHandler = {
            type: messageHandlerType,
            action: (_panel, data, callback) => {
                const testData = data as { type: string; testMessage: string };
                assert.ok(testData && testData.testMessage === testMessage);
                assert.ok(!!callback);
                callback(testResponseObj);
            }
        };
        const data = {
            type: messageHandlerType,
            testMessage,
            callbackId
        };

        processor.onWebviewReceivedMessage(data, panel, [messageHandler]);
        panel.dispose();
        postMessageStub.restore();
    });

    test('Multiple message handlers', async () => {
        type HandlerData = {
            type: string;
            testMessage: string;
            testResponseMessage: string;
            testResponseObj: { testResponseMessage: string };
            callbackId: number;
        };
        const processor = new WebviewProcessor(extensionUri);
        const panel = processor.createWebviewPanel('someViewType', 'someTitle');
        const handler1Data: HandlerData = {
            type: 'testType1',
            testMessage: 'A test messsage for testType1',
            testResponseMessage: 'A test response for testType1',
            testResponseObj: {
                testResponseMessage: 'A test messsage for testType1'
            },
            callbackId: 7
        };
        const handler2Data: HandlerData = {
            type: 'testType2',
            testMessage: 'A test messsage for testType2',
            testResponseMessage: 'A test response for testType2',
            testResponseObj: {
                testResponseMessage: 'A test messsage for testType2'
            },
            callbackId: 8
        };
        const postMessageStub = sinon
            .stub(panel.webview, 'postMessage')
            .callsFake((message) => {
                return new Promise((resolve) => {
                    const handlerData = [handler1Data, handler2Data].find(
                        (data) => {
                            return data.callbackId === message.callbackId;
                        }
                    );
                    assert.ok(!!handlerData);
                    assert.ok(
                        message.testResponseMessage ===
                            handlerData.testResponseMessage
                    );
                    return resolve(true);
                });
            });
        const messageHandlers: WebviewMessageHandler[] = [
            {
                type: handler1Data.type,
                action: (_panel, data, callback) => {
                    const testData = data as {
                        type: string;
                        testMessage: string;
                    };
                    assert.ok(
                        testData &&
                            testData.testMessage === handler1Data.testMessage
                    );
                    assert.ok(!!callback);
                    callback(handler1Data.testResponseObj);
                }
            },
            {
                type: handler2Data.type,
                action: (_panel, data, callback) => {
                    const testData = data as {
                        type: string;
                        testMessage: string;
                    };
                    assert.ok(
                        testData &&
                            testData.testMessage === handler2Data.testMessage
                    );
                    assert.ok(!!callback);
                    callback(handler2Data.testResponseObj);
                }
            }
        ];
        const data1 = {
            type: handler1Data.type,
            testMessage: handler1Data.testMessage,
            callbackId: handler1Data.callbackId
        };
        const data2 = {
            type: handler2Data.type,
            testMessage: handler2Data.testMessage,
            callbackId: handler2Data.callbackId
        };

        for (const data of [data1, data2]) {
            processor.onWebviewReceivedMessage(data, panel, messageHandlers);
        }
        panel.dispose();
        postMessageStub.restore();
    });

    test('Unique types for message handler collection passes validation', async () => {
        const messageHandlers: WebviewMessageHandler[] = [
            {
                type: 'type1',
                action: (_panel, data, callback) => {}
            },
            {
                type: 'type2',
                action: (_panel, data, callback) => {}
            }
        ];
        WebviewProcessor.validateMessageHanders(messageHandlers);
    });

    test('Repeated types for message handler collection fails validation', async () => {
        const messageHandlers: WebviewMessageHandler[] = [
            {
                type: 'type1',
                action: (_panel, _data) => {}
            },
            {
                type: 'type1',
                action: (_panel, _data) => {}
            }
        ];
        assert.throws(() => {
            WebviewProcessor.validateMessageHanders(messageHandlers);
        }, 'A collection of message handlers that has more than one instance of a given type, should fail validation.');
    });

    test('Get webview content with script demarcator', async () => {
        const extensionUriTempDir =
            await TempProjectDirManager.createTempProjectDir();
        const extensionUri = Uri.file(extensionUriTempDir.projectDir);
        const processor = new WebviewProcessor(extensionUri);
        const webviewPanel = processor.createWebviewPanel(
            'someViewType',
            'someTitle'
        );
        const contentWithDemarcator =
            '<html><body><script src="--- MESSAGING_SCRIPT_SRC ---"></script></body></html>';
        const contentWithDemarcatorDereferenced = `<html><body><script src="${webviewPanel.webview.asWebviewUri(
            processor.getMessagingJsPathUri()
        )}"></script></body></html>`;

        // Absolute path vars are for the test writing content. Relative path vars are
        // for processor.getWebviewContent().
        const contentFilename = 'contentFile.html';
        const contentDirPathRelative = 'content';
        const contentDirPathAbsolute = join(
            extensionUriTempDir.projectDir,
            contentDirPathRelative
        );
        const contentPathRelative = join(
            contentDirPathRelative,
            contentFilename
        );
        const contentPathAbsolute = join(
            contentDirPathAbsolute,
            contentFilename
        );

        await mkdir(
            join(extensionUriTempDir.projectDir, contentDirPathRelative)
        );
        await writeFile(contentPathAbsolute, contentWithDemarcator);

        const generatedWebviewContent = processor.getWebviewContent(
            webviewPanel,
            contentPathRelative
        );
        assert.equal(
            generatedWebviewContent,
            contentWithDemarcatorDereferenced
        );

        await extensionUriTempDir.removeDir();
        webviewPanel.dispose();
    });
});
