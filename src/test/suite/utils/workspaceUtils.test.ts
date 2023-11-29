/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import * as path from 'path';
import { mkdir } from 'fs/promises';
import {
    NoStaticResourcesDirError,
    NoWorkspaceError,
    WorkspaceUtils
} from '../../../utils/workspaceUtils';
import {
    TempProjectDirManager,
    setupTempWorkspaceDirectoryStub
} from '../../TestHelper';
import { afterEach, beforeEach } from 'mocha';
import sinon = require('sinon');

suite('Workspace Test Suite', () => {
    let getWorkspaceDirStub: sinon.SinonStub<[], string>;
    let tempProjectDirManager: TempProjectDirManager;

    beforeEach(async function () {
        tempProjectDirManager =
            await TempProjectDirManager.createTempProjectDir();
        getWorkspaceDirStub = setupTempWorkspaceDirectoryStub(
            tempProjectDirManager
        );
    });

    afterEach(async function () {
        getWorkspaceDirStub.restore();
        await tempProjectDirManager.removeDir();
        sinon.restore();
    });

    test('Static resources dir: workspace does not exist', async () => {
        try {
            // Currently, the only time we *don't* want to stub
            // WorkspaceUtils.getWorkspaceDir().
            getWorkspaceDirStub.restore();
            await WorkspaceUtils.getStaticResourcesDir();
            assert.fail('There should have been an error thrown.');
        } catch (noWorkspaceErr) {
            assert.ok(
                noWorkspaceErr instanceof NoWorkspaceError,
                'No workspace should be defined in this test.'
            );
        } finally {
            getWorkspaceDirStub = setupTempWorkspaceDirectoryStub(
                tempProjectDirManager
            );
        }
    });

    test('Static resources dir: static resources dir does not exist', async () => {
        try {
            await WorkspaceUtils.getStaticResourcesDir();
            assert.fail('There should have been an error thrown.');
        } catch (noStaticDirErr) {
            assert.ok(
                noStaticDirErr instanceof NoStaticResourcesDirError,
                'No static resources dir should be defined in this test.'
            );
        }
    });

    test('Static resources dir: static resources dir exists', async () => {
        const staticResourcesAbsPath = path.join(
            tempProjectDirManager.projectDir,
            WorkspaceUtils.STATIC_RESOURCES_PATH
        );
        await mkdir(staticResourcesAbsPath, { recursive: true });

        const outputDir = await WorkspaceUtils.getStaticResourcesDir();
        assert.equal(outputDir, staticResourcesAbsPath);
    });
});
