/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { mkdir, rm} from 'fs/promises';
import {
    NoStaticResourcesDirError,
    NoWorkspaceError,
    WorkspaceUtils
} from '../../../src/utils/workspaceUtils';
import {
    TempProjectDirManager,
    setupTempWorkspaceDirectoryStub
} from '../../TestHelper';
import { afterEach, beforeEach } from 'mocha';
import * as sinon from 'sinon';
import {ESLINT_CONFIG_FILE, ESLINT_RC_FILE, SFDX_PROJECT_FILE } from '../../../src/utils/constants';

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

    test('Existence of package.json can be determined', () => {
        let exists = WorkspaceUtils.packageJsonExists();
        assert.equal(exists, false);

        const packageJson = { a: 'b' };
        WorkspaceUtils.setPackageJson(packageJson);

        exists = WorkspaceUtils.packageJsonExists();
        assert.equal(exists, true);

        const content = WorkspaceUtils.getPackageJson();
        assert.equal(JSON.stringify(content), JSON.stringify(packageJson));
    });

    test('Existence of eslint configuration file can be determined', () => {
        let exists = WorkspaceUtils.eslintConfigurationExists(ESLINT_CONFIG_FILE);
        assert.equal(exists, false);

        const eslintConfiguration = `
        const eslintJs = require("@eslint/js");
        const { defineConfig } = require("eslint/config");
        const lwcConfig = require("@salesforce/eslint-config-lwc/recommended");

        module.exports = defineConfig([
            {
                files: ["**/*.js"],
                extends: [lwcConfig]
            }
        ]);
        `;
        WorkspaceUtils.writeEslintConfiguration(ESLINT_CONFIG_FILE, eslintConfiguration);
        exists = WorkspaceUtils.eslintConfigurationExists(ESLINT_CONFIG_FILE);
        assert.equal(exists, true);

        const content = WorkspaceUtils.readEslintConfiguration(ESLINT_CONFIG_FILE);
        assert.equal(content, eslintConfiguration);
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

    test('Legacy ESLint configuration existance can be determined', async() => {
        let exists = WorkspaceUtils.legacyEslintConfigurationExists();
        assert.equal(exists, false);

        const rootConfigFile = path.join(
            tempProjectDirManager.projectDir, 
            ESLINT_RC_FILE
        );

        fs.writeFileSync(rootConfigFile, '');

        exists = WorkspaceUtils.legacyEslintConfigurationExists();
        assert.equal(exists, true);

        await rm(rootConfigFile);

        exists = WorkspaceUtils.legacyEslintConfigurationExists();
        assert.equal(exists, false);

        await mkdir(path.join(tempProjectDirManager.projectDir, WorkspaceUtils.LWC_PATH), { recursive: true });

        const lwcConfigFile = path.join(
            tempProjectDirManager.projectDir, 
            WorkspaceUtils.LWC_PATH,
            ESLINT_RC_FILE
        );
        fs.writeFileSync(lwcConfigFile, '');

        exists = WorkspaceUtils.legacyEslintConfigurationExists();
        assert.equal(exists, true);
    })
});
