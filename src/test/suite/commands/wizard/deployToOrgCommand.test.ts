/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import { afterEach } from 'mocha';
import { Uri, commands, window, workspace } from 'vscode';
import { DeployToOrgCommand } from '../../../../commands/wizard/deployToOrgCommand';

suite('Deploy To Org Command Test Suite', () => {
    afterEach(function () {
        sinon.restore();
    });

    test('Deployment fails if no workspace set', async () => {
        // setup up so that workspace is not set
        const workspaceStub = sinon.stub(workspace, 'workspaceFolders');
        workspaceStub.value(null);

        // simulate error message shown
        const showErrorMessageStub = sinon.stub(window, 'showErrorMessage');
        showErrorMessageStub.onCall(0).resolves({ title: 'OK' });

        // execute our command
        const result = await DeployToOrgCommand.deployToOrg();
        assert.equal(result, false);
    });

    test('Deployment cancelled by the user', async () => {
        // setup up so that workspace is set
        const workspaceStub = sinon.stub(workspace, 'workspaceFolders');
        workspaceStub.value({});

        // simulate user choosing not to deploy
        const showInformationMessageStub = sinon.stub(
            window,
            'showInformationMessage'
        );
        showInformationMessageStub.onCall(0).resolves({ title: 'Cancel' });

        // execute our command
        const result = await DeployToOrgCommand.deployToOrg();
        assert.equal(result, false);
    });

    test('Deployment succeeds', async () => {
        // setup up so that workspace is set
        const workspaceStub = sinon.stub(workspace, 'workspaceFolders');
        workspaceStub.value([{ uri: { fsPath: 'fakePath' } }]);

        // simulate user choosing not to deploy
        const showInformationMessageStub = sinon.stub(
            window,
            'showInformationMessage'
        );
        showInformationMessageStub.onCall(0).resolves({ title: 'Deploy' });

        // simulate fake deployment to succeed
        const uriStub = sinon.stub(Uri, 'file');
        uriStub.callsFake((path: string) => {
            return Uri.parse('http://web.com');
        });

        const executeCommandStub = sinon.stub(commands, 'executeCommand');
        executeCommandStub.onCall(0).resolves();

        // execute our command
        const result = await DeployToOrgCommand.deployToOrg();
        assert.equal(result, true);
    });
});
