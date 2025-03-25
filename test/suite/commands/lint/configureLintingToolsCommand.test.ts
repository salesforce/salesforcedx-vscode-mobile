/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as path from 'path';
import * as fs from 'fs';
import { window } from 'vscode';
import { afterEach } from 'mocha';
import { ConfigureLintingToolsCommand } from '../../../../src/commands/lint/configureLintingToolsCommand';
import { WorkspaceUtils } from '../../../../src/utils/workspaceUtils';
import {
    TempProjectDirManager,
    setupTempWorkspaceDirectoryStub
} from '../../../TestHelper';
import { Connection } from '@salesforce/core';
import { CoreExtensionService } from '../../../../src/services';

suite('Configure Linting Tools Command Test Suite', () => {
    
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

    afterEach(function () {
        sinon.restore();
    });

    test('Configure linting cancelled because LWC folder does not exist', async () => {
        sinon.stub(WorkspaceUtils, 'lwcFolderExists').returns(false);
        const sendExceptionStub = sinon.stub();
        const sendCommandEventStub = sinon.stub();
        stubTelemetryService(sendExceptionStub, sendCommandEventStub);
        const showErrorMessageStub = sinon.stub(window, 'showErrorMessage');
        showErrorMessageStub.onCall(0).resolves({ title: 'OK' });
        const result = await ConfigureLintingToolsCommand.configure();
        assert.equal(result, false);
        // Assert telemetry
        assert.equal(sendExceptionStub.callCount, 1);
        assert.equal(sendCommandEventStub.callCount, 1);
    });

    test('Configure linting cancelled because package.json does not exist', async () => {
        sinon.stub(WorkspaceUtils, 'lwcFolderExists').returns(true);
        sinon.stub(WorkspaceUtils, 'packageJsonExists').returns(false);
        const sendExceptionStub = sinon.stub();
        const sendCommandEventStub = sinon.stub();
        stubTelemetryService(sendExceptionStub, sendCommandEventStub);
        const showErrorMessageStub = sinon.stub(window, 'showErrorMessage');
        showErrorMessageStub.onCall(0).resolves({ title: 'OK' });
        const result = await ConfigureLintingToolsCommand.configure();
        assert.equal(result, false);
        // Assert telemetry
        assert.equal(sendExceptionStub.callCount, 1);
        assert.equal(sendCommandEventStub.callCount, 1);
    });

    test('Configure linting cancelled by the user', async () => {
        sinon.stub(WorkspaceUtils, 'lwcFolderExists').returns(true);
        sinon.stub(WorkspaceUtils, 'packageJsonExists').returns(true);
        const sendExceptionStub = sinon.stub();
        const sendCommandEventStub = sinon.stub();
        stubTelemetryService(sendExceptionStub, sendCommandEventStub);
        const showInformationMessageStub = sinon.stub(
            window,
            'showInformationMessage'
        );
        showInformationMessageStub.onCall(0).resolves({ title: 'No' });
        const result = await ConfigureLintingToolsCommand.configure();
        assert.equal(result, false);
        // Assert telemetry
        assert.equal(sendExceptionStub.callCount, 0);
        assert.equal(sendCommandEventStub.callCount, 1);
    });

    test('Configure linting cancelled because updating pacakge.json failed', async () => {
        sinon.stub(WorkspaceUtils, 'lwcFolderExists').returns(true);
        sinon.stub(WorkspaceUtils, 'packageJsonExists').returns(true);
        const sendExceptionStub = sinon.stub();
        const sendCommandEventStub = sinon.stub();
        stubTelemetryService(sendExceptionStub, sendCommandEventStub);
        const showInformationMessageStub = sinon.stub(
            window,
            'showInformationMessage'
        );
        showInformationMessageStub.onCall(0).resolves({ title: 'Yes' });
        sinon
            .stub(ConfigureLintingToolsCommand, 'updateDevDependencies')
            .throws('error');
        const showErrorMessageStub = sinon.stub(window, 'showErrorMessage');
        showErrorMessageStub.onCall(0).resolves({ title: 'OK' });
        const result = await ConfigureLintingToolsCommand.configure();
        assert.equal(result, false);
        // Assert telemetry
        assert.equal(sendExceptionStub.callCount, 1);
        assert.equal(sendCommandEventStub.callCount, 1);
    });

    test('Configure linting cancelled because updating .eslintrc.json failed', async () => {
        sinon.stub(WorkspaceUtils, 'lwcFolderExists').returns(true);
        sinon.stub(WorkspaceUtils, 'packageJsonExists').returns(true);
        const sendExceptionStub = sinon.stub();
        const sendCommandEventStub = sinon.stub();
        stubTelemetryService(sendExceptionStub, sendCommandEventStub);
        const showInformationMessageStub = sinon.stub(
            window,
            'showInformationMessage'
        );
        showInformationMessageStub.onCall(0).resolves({ title: 'Yes' });
        sinon
            .stub(ConfigureLintingToolsCommand, 'updateDevDependencies')
            .returns(true);
        sinon
            .stub(ConfigureLintingToolsCommand, 'updateEslintrc')
            .throws('error');
        const showErrorMessageStub = sinon.stub(window, 'showErrorMessage');
        showErrorMessageStub.onCall(0).resolves({ title: 'OK' });
        const result = await ConfigureLintingToolsCommand.configure();
        assert.equal(result, false);
        // Assert telemetry
        assert.equal(sendExceptionStub.callCount, 1);
        assert.equal(sendCommandEventStub.callCount, 1);        
    });

    test('Configure linting did not update package.json because plugin was already included in the dev dependency', async () => {
        sinon.stub(WorkspaceUtils, 'lwcFolderExists').returns(true);
        sinon.stub(WorkspaceUtils, 'packageJsonExists').returns(true);
        const sendExceptionStub = sinon.stub();
        const sendCommandEventStub = sinon.stub();
        stubTelemetryService(sendExceptionStub, sendCommandEventStub);
        let showInformationMessageStub = sinon.stub(
            window,
            'showInformationMessage'
        );
        showInformationMessageStub.onCall(0).resolves({ title: 'Yes' });
        sinon
            .stub(ConfigureLintingToolsCommand, 'updateDevDependencies')
            .returns(false);
        sinon
            .stub(ConfigureLintingToolsCommand, 'updateEslintrc')
            .returns(false);
        showInformationMessageStub = sinon.stub(window, 'showErrorMessage');
        showInformationMessageStub.onCall(0).resolves({ title: 'OK' });
        const result = await ConfigureLintingToolsCommand.configure();
        assert.equal(result, true);
        // Assert telemetry
        assert.equal(sendExceptionStub.callCount, 0);
        assert.equal(sendCommandEventStub.callCount, 2);            
    });

    test('Configure linting updated package.json successfully', async () => {
        let getWorkspaceDirStub: sinon.SinonStub<[], string>;
        let tempProjectDirManager: TempProjectDirManager;
        tempProjectDirManager =
            await TempProjectDirManager.createTempProjectDir();
        getWorkspaceDirStub = setupTempWorkspaceDirectoryStub(
            tempProjectDirManager
        );
        const packageJson = { devDependencies: { lwc: '1.2.3' } };
        WorkspaceUtils.setPackageJson(packageJson);
        const sendExceptionStub = sinon.stub();
        const sendCommandEventStub = sinon.stub();
        stubTelemetryService(sendExceptionStub, sendCommandEventStub);
        sinon.stub(WorkspaceUtils, 'lwcFolderExists').returns(true);
        let showInformationMessageStub = sinon.stub(
            window,
            'showInformationMessage'
        );
        showInformationMessageStub.onCall(0).resolves({ title: 'Yes' });
        showInformationMessageStub.onCall(1).resolves({ title: 'Yes' });

        try {
            // Creating directories recursively
            const lwcPath = path.join(
                WorkspaceUtils.getWorkspaceDir(),
                WorkspaceUtils.LWC_PATH
            );
            fs.mkdirSync(lwcPath, { recursive: true });
        } catch (error) {
            console.error('Error creating directories:', error);
        }

        const result = await ConfigureLintingToolsCommand.configure();
        assert.equal(result, true);
        // Assert telemetry
        assert.equal(sendExceptionStub.callCount, 0);
        assert.equal(sendCommandEventStub.callCount, 3);   

        const content = WorkspaceUtils.getPackageJson();
        const updatedPackageJson = {
            devDependencies: {
                lwc: '1.2.3',
                // eslint-disable-next-line @typescript-eslint/naming-convention
                "@salesforce/eslint-plugin-lwc-mobile":"^1.1.0",
                // eslint-disable-next-line @typescript-eslint/naming-convention
                '@salesforce/eslint-plugin-lwc-graph-analyzer': '^0.9.0',
                eslint: '^8.47.0'
            }
        };
        assert.equal(
            JSON.stringify(updatedPackageJson),
            JSON.stringify(content)
        );
    });
});
