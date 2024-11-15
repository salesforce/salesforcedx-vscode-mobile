/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { mkdir } from 'fs/promises';
import { WorkspaceUtils } from '../../src/utils/workspaceUtils';
import {
    TempProjectDirManager,
    setupTempWorkspaceDirectoryStub
} from '../TestHelper';
import { suite, test, afterEach, beforeEach } from 'mocha';
import * as sinon from 'sinon';
import { SFDX_PROJECT_FILE } from '../../src/utils/constants';

suite('Workspace Test Suite - Server', () => {
    let getWorkspaceDirStub: sinon.SinonStub<[], string>;
    let tempProjectDirManager: TempProjectDirManager;

    let sandbox: sinon.SinonSandbox;

    beforeEach(async function () {
        sandbox = sinon.createSandbox();
        tempProjectDirManager =
            await TempProjectDirManager.createTempProjectDir();
        getWorkspaceDirStub = setupTempWorkspaceDirectoryStub(
            sandbox,
            tempProjectDirManager
        );
    });

    afterEach(async function () {
        sandbox.restore();
        await tempProjectDirManager.removeDir();
    });

    test('Existence of LWC folder can be determined', async () => {
        let exists = WorkspaceUtils.lwcFolderExists();
        assert.equal(exists, false);

        const lwcPath = path.join(
            tempProjectDirManager.projectDir,
            WorkspaceUtils.LWC_PATH
        );
        await mkdir(lwcPath, { recursive: true });

        exists = WorkspaceUtils.lwcFolderExists();
        assert.equal(exists, true);
    });

    test('Sfdx project is opened', () => {
        let opened = WorkspaceUtils.isSfdxProjectOpened();
        assert.equal(opened, false);

        const sfdxJson = path.join(
            tempProjectDirManager.projectDir,
            SFDX_PROJECT_FILE
        );
        fs.writeFileSync(sfdxJson, '');

        opened = WorkspaceUtils.isSfdxProjectOpened();
        assert.equal(opened, true);
    });
});
