/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import { afterEach, beforeEach } from 'mocha';
import { BriefcaseCommand } from '../../../commands/briefcaseCommand';
import { Uri, l10n, window, Progress, CancellationToken } from 'vscode';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import { InstructionsWebviewProvider } from '../../../webviews';

suite('Briefcase Command Test Suite', () => {
    beforeEach(function () {});

    afterEach(function () {
        sinon.restore();
    });

    test('Shows informational messages and excutes the open-to-briefcase command', async () => {
        // stub for showInformationMessage
        const showInfoMsgStub = sinon.stub(window, 'showInformationMessage');
        showInfoMsgStub.onCall(0).resolves();

        // stub for executing the open briefcase command
        const windowWithProgressStub = sinon.stub(window, 'withProgress');
        windowWithProgressStub.onCall(0).resolves();
        const cmdStub = sinon.stub(CommonUtils, 'executeCommandAsync');
        cmdStub.onCall(0).resolves();

        // stub for showDismissableInstructions
        const showDismissableInstructionsStub = sinon.stub(
            InstructionsWebviewProvider,
            'showDismissableInstructions'
        );

        const extensionUri = Uri.parse('file:///extension_dir');

        // act
        await BriefcaseCommand.setupBriefcase(extensionUri);

        // ensure info message was shown
        const message = showInfoMsgStub.args[0][0];
        const messageOptions: { [key: string]: any } =
            showInfoMsgStub.args[0][1];
        const title = messageOptions['title'];
        assert.ok(message); // too brittle to check exact message, so just ensure it is not null
        assert.equal(title, l10n.t('OK'));

        // obtain the command argument passed to window.withProgress() and execute it
        const taskArg = windowWithProgressStub.args[0][1];
        const progressStub: Progress<{ message?: string; increment?: number }> =
            {
                report: sinon.stub()
            };
        const cancellationTokenStub: CancellationToken = {
            isCancellationRequested: false,
            onCancellationRequested: sinon.stub()
        };
        await taskArg(progressStub, cancellationTokenStub);
        const commandExecuted = cmdStub.args[0][0];
        assert.equal(
            commandExecuted,
            BriefcaseCommand.OPEN_ORG_BRIEFCASE_PAGE_CMD
        );

        // ensure showDismissableInstructions was called with expected args
        const uriArg = showDismissableInstructionsStub.args[0][0];
        const titleArg = showDismissableInstructionsStub.args[0][1];
        const pathArg = showDismissableInstructionsStub.args[0][2];
        assert.equal(uriArg, extensionUri);
        assert.equal(titleArg, l10n.t('Briefcase Setup'));
        assert.equal(pathArg, 'src/instructions/briefcase.html');
    });
});
