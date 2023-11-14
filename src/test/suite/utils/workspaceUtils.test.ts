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
import { TempProjectDirManager } from '../../TestHelper';
import { afterEach, beforeEach } from 'mocha';
import sinon = require('sinon');

suite('Workspace Test Suite', () => {
    beforeEach(function () {});

    afterEach(function () {
        sinon.restore();
    });

    test('Static resources dir: workspace does not exist', async () => {
        try {
            await WorkspaceUtils.getStaticResourcesDir();
            assert.fail('There should have been an error thrown.');
        } catch (noWorkspaceErr) {
            assert.ok(
                noWorkspaceErr instanceof NoWorkspaceError,
                'No workspace should be defined in this test.'
            );
        }
    });

    test('Static resources dir: static resources dir does not exist', async () => {
        const projectDirMgr =
            await TempProjectDirManager.createTempProjectDir();
        const getWorkspaceDirStub = sinon.stub(
            WorkspaceUtils,
            'getWorkspaceDir'
        );
        getWorkspaceDirStub.returns(projectDirMgr.projectDir);
        try {
            await WorkspaceUtils.getStaticResourcesDir();
            assert.fail('There should have been an error thrown.');
        } catch (noStaticDirErr) {
            assert.ok(
                noStaticDirErr instanceof NoStaticResourcesDirError,
                'No static resources dir should be defined in this test.'
            );
        } finally {
            await projectDirMgr.removeDir();
            getWorkspaceDirStub.restore();
        }
    });

    test('Static resources dir: static resources dir exists', async () => {
        const projectDirMgr =
            await TempProjectDirManager.createTempProjectDir();
        const getWorkspaceDirStub = sinon.stub(
            WorkspaceUtils,
            'getWorkspaceDir'
        );
        getWorkspaceDirStub.returns(projectDirMgr.projectDir);

        const staticResourcesAbsPath = path.join(
            projectDirMgr.projectDir,
            WorkspaceUtils.STATIC_RESOURCES_PATH
        );
        await mkdir(staticResourcesAbsPath, { recursive: true });

        try {
            const outputDir = await WorkspaceUtils.getStaticResourcesDir();
            assert.equal(outputDir, staticResourcesAbsPath);
        } finally {
            await projectDirMgr.removeDir();
            getWorkspaceDirStub.restore();
        }
    });
});
