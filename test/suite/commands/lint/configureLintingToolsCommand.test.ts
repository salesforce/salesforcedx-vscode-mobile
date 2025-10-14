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

    test('Configure linting cancelled because project eslint configuration is still in legacy format < eslint 9.x', async () => {
        sinon.stub(WorkspaceUtils, 'lwcFolderExists').returns(true);
        sinon.stub(WorkspaceUtils, 'packageJsonExists').returns(false);
        sinon.stub(WorkspaceUtils, 'legacyEslintConfigurationExists').returns(true);
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
        sinon.stub(WorkspaceUtils, 'legacyEslintConfigurationExists').returns(false);
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
        sinon.stub(WorkspaceUtils, 'eslintConfigurationExists').returns(false);
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
            .stub(ConfigureLintingToolsCommand, 'initializeEslintConfiguration')
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
        sinon.stub(WorkspaceUtils, 'eslintConfigurationExists').returns(false);
        sinon.stub(WorkspaceUtils, 'legacyEslintConfigurationExists').returns(false);
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
        sinon
            .stub(ConfigureLintingToolsCommand, 'initializeEslintConfiguration')
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
                "@salesforce/eslint-plugin-lwc-mobile":"^1.2.0",
                // eslint-disable-next-line @typescript-eslint/naming-convention
                '@salesforce/eslint-plugin-lwc-graph-analyzer': '^1.0.0',
                eslint: '^9.29.0'
            }
        };
        assert.equal(
            JSON.stringify(updatedPackageJson),
            JSON.stringify(content)
        );
    });

    test('Configure linting when project has no eslint.config.js file at all', async () => {
        sinon.stub(WorkspaceUtils, 'lwcFolderExists').returns(true);
        sinon.stub(WorkspaceUtils, 'packageJsonExists').returns(true);
        sinon.stub(WorkspaceUtils, 'legacyEslintConfigurationExists').returns(false);
        // Mock that eslint.config.js does not exist
        sinon.stub(WorkspaceUtils, 'eslintConfigurationExists').returns(false);
        
        const sendExceptionStub = sinon.stub();
        const sendCommandEventStub = sinon.stub();
        stubTelemetryService(sendExceptionStub, sendCommandEventStub);
        
        const showInformationMessageStub = sinon.stub(
            window,
            'showInformationMessage'
        );
        showInformationMessageStub.onCall(0).resolves({ title: 'Yes' });
        showInformationMessageStub.onCall(1).resolves({ title: 'OK' });
        showInformationMessageStub.onCall(2).resolves({ title: 'OK' });
        showInformationMessageStub.onCall(3).resolves({ title: 'OK' });

        // Mock the initializeEslintConfiguration method to return true
        const initializeEslintConfigStub = sinon.stub(
            ConfigureLintingToolsCommand,
            'initializeEslintConfiguration'
        );

        // Mock the updateDevDependencies method to return true
        const updateDevDependenciesStub = sinon.stub(
            ConfigureLintingToolsCommand,
            'updateDevDependencies'
        );

        const result = await ConfigureLintingToolsCommand.configure();
        
        assert.equal(result, true);
        // Assert that initializeEslintConfiguration was called
        assert.equal(initializeEslintConfigStub.callCount, 1);
        // Assert telemetry
        assert.equal(sendExceptionStub.callCount, 0);
        assert.equal(sendCommandEventStub.callCount, 2); 
    });

    test('Configure linting when project has eslint.config.js but no eslint.config.mobile.js', async () => {
        sinon.stub(WorkspaceUtils, 'lwcFolderExists').returns(true);
        sinon.stub(WorkspaceUtils, 'packageJsonExists').returns(true);
        sinon.stub(WorkspaceUtils, 'legacyEslintConfigurationExists').returns(false);
        
        // Mock that eslint.config.js exists but eslint.config.mobile.js does not
        const eslintConfigExistsStub = sinon.stub(WorkspaceUtils, 'eslintConfigurationExists');
        eslintConfigExistsStub.withArgs('eslint.config.js').returns(true);
        eslintConfigExistsStub.withArgs('eslint.config.mobile.js').returns(false);
        
        const sendExceptionStub = sinon.stub();
        const sendCommandEventStub = sinon.stub();
        stubTelemetryService(sendExceptionStub, sendCommandEventStub);
        
        const showInformationMessageStub = sinon.stub(
            window,
            'showInformationMessage'
        );
        showInformationMessageStub.onCall(0).resolves({ title: 'Yes' });
        showInformationMessageStub.onCall(1).resolves({ title: 'OK' });
        showInformationMessageStub.onCall(2).resolves({ title: 'OK' });
        showInformationMessageStub.onCall(3).resolves({ title: 'OK' });

        // Mock the convertEslintConfiguration method to return true
        const convertEslintConfigStub = sinon.stub(
            ConfigureLintingToolsCommand,
            'convertEslintConfiguration'
        );

        // Mock the updateDevDependencies method to return true
        const updateDevDependenciesStub = sinon.stub(
            ConfigureLintingToolsCommand,
            'updateDevDependencies'
        ).returns(true);

        const result = await ConfigureLintingToolsCommand.configure();
        
        assert.equal(result, true);
        // Assert that convertEslintConfiguration was called
        assert.equal(convertEslintConfigStub.callCount, 1);
        // Assert telemetry
        assert.equal(sendExceptionStub.callCount, 0);
        assert.equal(sendCommandEventStub.callCount, 3); // CONFIGURE_LINTING_TOOLS_COMMAND_STARTED, UPDATED_PACKAGE_JSON, UPDATED_ESLINT_CONFIGURATION
    });

    test('Configure linting when project has both eslint.config.js and eslint.config.mobile.js', async () => {
        sinon.stub(WorkspaceUtils, 'lwcFolderExists').returns(true);
        sinon.stub(WorkspaceUtils, 'packageJsonExists').returns(true);
        sinon.stub(WorkspaceUtils, 'legacyEslintConfigurationExists').returns(false);
        
        // Mock that both eslint.config.js and eslint.config.mobile.js exist
        const eslintConfigExistsStub = sinon.stub(WorkspaceUtils, 'eslintConfigurationExists');
        eslintConfigExistsStub.withArgs('eslint.config.js').returns(true);
        eslintConfigExistsStub.withArgs('eslint.config.mobile.js').returns(true);
        
        const sendExceptionStub = sinon.stub();
        const sendCommandEventStub = sinon.stub();
        stubTelemetryService(sendExceptionStub, sendCommandEventStub);
        
        const showInformationMessageStub = sinon.stub(
            window,
            'showInformationMessage'
        );
        showInformationMessageStub.onCall(0).resolves({ title: 'Yes' });
        showInformationMessageStub.onCall(1).resolves({ title: 'OK' });
        showInformationMessageStub.onCall(2).resolves({ title: 'OK' });
        showInformationMessageStub.onCall(3).resolves({ title: 'OK' });

        // Mock the updateMobileEslintConfiguration method to return true
        const updateMobileEslintConfigStub = sinon.stub(
            ConfigureLintingToolsCommand,
            'updateMobileEslintConfiguration'
        );

        // Mock the updateDevDependencies method to return true
        const updateDevDependenciesStub = sinon.stub(
            ConfigureLintingToolsCommand,
            'updateDevDependencies'
        ).returns(true);

        const result = await ConfigureLintingToolsCommand.configure();
        
        assert.equal(result, true);
        // Assert that updateMobileEslintConfiguration was called
        assert.equal(updateMobileEslintConfigStub.callCount, 1);
        // Assert telemetry
        assert.equal(sendExceptionStub.callCount, 0);
        assert.equal(sendCommandEventStub.callCount, 3); // CONFIGURE_LINTING_TOOLS_COMMAND_STARTED, UPDATED_PACKAGE_JSON, UPDATED_ESLINT_CONFIGURATION
    });

});
