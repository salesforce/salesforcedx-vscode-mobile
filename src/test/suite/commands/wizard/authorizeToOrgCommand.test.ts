/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import { commands, window } from 'vscode';
import { afterEach } from 'mocha';
import { AuthorizeCommand } from '../../../../commands/wizard/authorizeCommand';
import { OrgUtils } from '../../../../utils/orgUtils';

suite('Authorize Org Command Test Suite', () => {
    afterEach(function () {
        sinon.restore();
    });

    test('Already authorized to an org ', async () => {
        // setup up so that org is authorized already
        const getDefaultUserStub = sinon.stub(OrgUtils, 'getDefaultUser');
        getDefaultUserStub.onCall(0).resolves('vscodeOrg');

        // execute our command
        const result = await AuthorizeCommand.authorizeToOrg();
        assert.equal(result, true);
    });

    test('Authorization cancelled by the user', async () => {
        // setup up so that org is not authorized yet
        const getDefaultUserStub = sinon.stub(OrgUtils, 'getDefaultUser');
        getDefaultUserStub.onCall(0).rejects(false);

        // simulate user choosing not to authorize
        const showInformationMessageStub = sinon.stub(
            window,
            'showInformationMessage'
        );
        showInformationMessageStub.onCall(0).resolves({ title: 'No' });

        // execute our command
        const result = await AuthorizeCommand.authorizeToOrg();
        assert.equal(result, false);
    });

    test('Authorization executed by user', async () => {
        // setup up so that org is not authorized yet
        const getDefaultUserStub = sinon.stub(OrgUtils, 'getDefaultUser');
        getDefaultUserStub.onCall(0).resolves('undefined');

        // simulate user choosing to authorize
        const showInformationMessageStub = sinon.stub(
            window,
            'showInformationMessage'
        );
        showInformationMessageStub.onCall(0).resolves({ title: 'Authorize' });
        showInformationMessageStub.onCall(1).resolves({ title: 'OK' });

        const executeCommandStub = sinon.stub(commands, 'executeCommand');
        executeCommandStub.onCall(0).resolves();

        // execute our command
        const result = await AuthorizeCommand.authorizeToOrg();
        assert.equal(result, true);
    });
});
