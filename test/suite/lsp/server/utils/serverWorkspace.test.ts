/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import { suite, test } from 'mocha';
import { ServerWorkspace } from '../../../../../src/lsp/server/utils/serverWorkspace';

suite('Server Workspace Test Suite', () => {
    test('Undefined workspace folder parameter will throw error', async () => {
        assert.throws(() => {
            ServerWorkspace.initWorkspaceFolders(undefined);
        });
    });

    test('Throws error when there is no legal workspace folder assigned yet', async () => {
        assert.throws(() => {
            ServerWorkspace.getWorkspaceDir();
        });
    });

    test('Legal workspace folder assigned to ServerWorkspace will be the return value when it is queried for', async () => {
        ServerWorkspace.initWorkspaceFolders([{uri: "https://www.salesforce.com", name: "Salesforce"}]);
        ServerWorkspace.getWorkspaceDir()
    });
});