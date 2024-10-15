/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import { afterEach } from 'mocha';
import { Uri, env, window } from 'vscode';
import { Connection } from '@salesforce/core';
import { LiveKomaciAnalyzeCommand } from '../../../../commands/toolingHub/liveKomaciAnalyze';
import { CoreExtensionService } from '../../../../services';

suite('Live Komaci Analyze Command Test Suite', () => {
    afterEach(function () {
        sinon.restore();
    });

    test('Extracts LWC name from URI, instanceUrl from workspace context, and namespace from project config', async () => {
        stubWorkspaceContext('instanceUrl');
        stubProjectConfig('mockLwcNamespace');
        const sendExceptionStub = sinon.stub();
        const sendCommandEventStub = sinon.stub();
        stubTelemetryService(sendExceptionStub, sendCommandEventStub);
        let vscodeEnvOpenExternalSpy = sinon.spy(env);
        const sourceUri = Uri.file(
            '/Users/a.liu/Documents/sfdx/sfPlayground/force-app/main/default/lwc/childCmpA/childCmpA.html'
        );

        const result = await LiveKomaciAnalyzeCommand.execute(
            sourceUri,
            undefined
        );

        assert.equal(vscodeEnvOpenExternalSpy.openExternal.callCount, 1);
        // Assert shape of URL opened is good
        assert.equal(
            vscodeEnvOpenExternalSpy.openExternal.args[0][0],
            'instanceUrl/lwr/application/amd/0/e/native/ai/lightningmobileruntime%2Ftoolinghub?tab=audit&lwcName=childCmpA&lwcNamespace=mockLwcNamespace&visualize=true'
        );
        // Assert telemetry
        assert.equal(sendExceptionStub.callCount, 0);
        assert.equal(sendCommandEventStub.callCount, 1);
    });

    test('Defaults namespace to c if not given one', async () => {
        stubWorkspaceContext('instanceUrl');
        stubProjectConfig('');
        const sendExceptionStub = sinon.stub();
        const sendCommandEventStub = sinon.stub();
        stubTelemetryService(sendExceptionStub, sendCommandEventStub);
        let vscodeEnvOpenExternalSpy = sinon.spy(env);
        const sourceUri = Uri.file(
            '/Users/a.liu/Documents/sfdx/sfPlayground/force-app/main/default/lwc/childCmpA/childCmpA.html'
        );

        const result = await LiveKomaciAnalyzeCommand.execute(
            sourceUri,
            undefined
        );

        assert.equal(vscodeEnvOpenExternalSpy.openExternal.callCount, 1);
        assert.equal(
            vscodeEnvOpenExternalSpy.openExternal.args[0][0]
                .toString()
                .indexOf('lwcNamespace=c') >= 0,
            true
        );
        assert.equal(sendExceptionStub.callCount, 0);
        assert.equal(sendCommandEventStub.callCount, 1);
    });

    test('Aborts if given multiple sourceUris, which prevents it from analyzing 1 target', async () => {
        stubWorkspaceContext('instanceUrl');
        stubProjectConfig('mockLwcNamespace');
        const sendExceptionStub = sinon.stub();
        const sendCommandEventStub = sinon.stub();
        stubTelemetryService(sendExceptionStub, sendCommandEventStub);
        const showErrorMessageStub = sinon.stub(window, 'showErrorMessage');
        let vscodeEnvOpenExternalSpy = sinon.spy(env);
        const sourceUri = [
            Uri.file('/lwc/childCmpA/childCmpA.html'),
            Uri.file('/lwc/B/B.html')
        ];

        const result = await LiveKomaciAnalyzeCommand.execute(
            sourceUri,
            undefined
        );

        assert.equal(vscodeEnvOpenExternalSpy.openExternal.callCount, 0);
        assert.equal(showErrorMessageStub.callCount, 1);
        assert.equal(sendExceptionStub.callCount, 1);
        assert.equal(sendCommandEventStub.callCount, 0);
    });

    test('Aborts if given multiple uris, which prevents it from analyzing 1 target', async () => {
        stubWorkspaceContext('instanceUrl');
        stubProjectConfig('mockLwcNamespace');
        const sendExceptionStub = sinon.stub();
        const sendCommandEventStub = sinon.stub();
        stubTelemetryService(sendExceptionStub, sendCommandEventStub);
        const showErrorMessageStub = sinon.stub(window, 'showErrorMessage');
        let vscodeEnvOpenExternalSpy = sinon.spy(env);
        const sourceUri = Uri.file('/lwc/childCmpA/childCmpA.html');
        const uris = [
            Uri.file('/lwc/childCmpA/childCmpA.html'),
            Uri.file('/lwc/B/B.html')
        ];

        const result = await LiveKomaciAnalyzeCommand.execute(sourceUri, uris);

        assert.equal(vscodeEnvOpenExternalSpy.openExternal.callCount, 0);
        assert.equal(showErrorMessageStub.callCount, 1);
        assert.equal(sendExceptionStub.callCount, 1);
        assert.equal(sendCommandEventStub.callCount, 0);
    });

    // Helpers
    function stubWorkspaceContext(instanceUrl: string) {
        const stubConnection = sinon.createStubInstance(Connection);
        stubConnection.instanceUrl = instanceUrl;
        const getWorkspaceContextInstance = {
            getConnection: () => {
                return Promise.resolve(stubConnection);
            },
            onOrgChange: sinon.stub(),
            getInstance: sinon.stub(),
            username: sinon.stub(),
            alias: sinon.stub()
        };
        sinon
            .stub(CoreExtensionService, 'getWorkspaceContext')
            .returns(getWorkspaceContextInstance);
    }
    function stubProjectConfig(mockNamespace: string) {
        const getValueFn = () => {
            return new Promise((resolve) => {
                resolve(mockNamespace);
            });
        };
        const getSalesforceProjectConfigInstance = {
            getValue: getValueFn,
            getInstance: sinon.stub()
        };
        sinon
            .stub(CoreExtensionService, 'getSalesforceProjectConfig')
            .returns(getSalesforceProjectConfigInstance);
    }
    function stubTelemetryService(
        sendExceptionStub: any,
        sendCommandEventStub: any
    ) {
        const getTelemetryServiceInstance = {
            extensionName: 'mockExtensionName',
            isTelemetryEnabled: sinon.stub(),
            getInstance: sinon.stub(),
            getReporters: sinon.stub(),
            initializeService: sinon.stub(),
            sendExtensionActivationEvent: sinon.stub(),
            sendExtensionDeactivationEvent: sinon.stub(),
            sendCommandEvent: sendCommandEventStub,
            sendException: sendExceptionStub,
            dispose: sinon.stub()
        };
        sinon
            .stub(CoreExtensionService, 'getTelemetryService')
            .returns(getTelemetryServiceInstance);
    }
});
