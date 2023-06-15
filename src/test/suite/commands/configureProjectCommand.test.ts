/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import { writeFile } from 'fs/promises';
import { afterEach, beforeEach } from 'mocha';
import * as path from 'path';
import * as process from 'process';
import { CommonUtils } from '@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils';
import * as sinon from 'sinon';
import { l10n, Uri } from 'vscode';
import { ConfigureProjectCommand } from '../../../commands/configureProjectCommand';
import {
    createTempProjectDir,
    createNonExistentAbsolutePath,
    removeTempProjectDir
} from '../../TestHelper';

suite('Configure Project Command Test Suite', () => {
    beforeEach(function () {});

    afterEach(function () {
        sinon.restore();
    });

    test('Open Project: Non-existent folder is an error', async () => {
        const origCwd = process.cwd();
        const extensionUri = Uri.file('whateva');
        const nonExistentFolderUri = Uri.file(createNonExistentAbsolutePath());
        try {
            await new ConfigureProjectCommand(
                extensionUri
            ).validateProjectFolder(nonExistentFolderUri);
            assert.fail('Validation should fail on a non-existent folder.');
        } catch (err) {
            assert.equal(
                (err as Error).message,
                l10n.t(
                    "Could not access the project folder at '{0}'.",
                    nonExistentFolderUri.fsPath
                )
            );
        } finally {
            assert.equal(origCwd, process.cwd());
        }
    });

    test('Open Project: No git installed is an error', async () => {
        const origCwd = process.cwd();
        const extensionUri = Uri.file('whateva');
        const projectFolderUri = Uri.file(await createTempProjectDir());
        const cmdStub = sinon.stub(CommonUtils, 'executeCommandAsync');
        cmdStub.onCall(0).rejects();
        try {
            await new ConfigureProjectCommand(
                extensionUri
            ).validateProjectFolder(projectFolderUri);
            assert.fail('Validation should fail if git is not installed.');
        } catch (err) {
            assert.equal(
                (err as Error).message,
                l10n.t('git is not installed.')
            );
        } finally {
            cmdStub.restore();
            assert.equal(origCwd, process.cwd());
            removeTempProjectDir(projectFolderUri.fsPath);
        }
    });

    test('Open Project: Project is not a git repo', async () => {
        const origCwd = process.cwd();
        const extensionUri = Uri.file('whateva');
        const projectFolderUri = Uri.file(await createTempProjectDir());

        try {
            await new ConfigureProjectCommand(
                extensionUri
            ).validateProjectFolder(projectFolderUri);
            assert.fail(
                'Validation should fail if project dir is not a git repo.'
            );
        } catch (err) {
            assert.equal(
                (err as Error).message,
                l10n.t(
                    "Folder '{0}' does not contain a git repository.",
                    projectFolderUri.fsPath
                )
            );
        } finally {
            assert.equal(origCwd, process.cwd());
            removeTempProjectDir(projectFolderUri.fsPath);
        }
    });

    test('Open Project: Project is not the Starter Kit git repo', async () => {
        const origCwd = process.cwd();
        const extensionUri = Uri.file('whateva');
        const projectFolderUri = Uri.file(await createTempProjectDir());

        // Create a skeleton git repo
        process.chdir(projectFolderUri.fsPath);
        await CommonUtils.executeCommandAsync('git init');
        await writeFile(path.join(process.cwd(), 'README.txt'), 'Some content');
        await CommonUtils.executeCommandAsync('git add README.txt');
        await CommonUtils.executeCommandAsync(
            'git commit --no-gpg-sign -m "Initial commit"'
        );
        process.chdir(origCwd);

        try {
            await new ConfigureProjectCommand(
                extensionUri
            ).validateProjectFolder(projectFolderUri);
            assert.fail(
                'Validation should fail if project dir is not the Starter Kit repo.'
            );
        } catch (err) {
            assert.equal(
                (err as Error).message,
                l10n.t(
                    "The git repository at '{0}' does not share history with the Offline Starter Kit.",
                    projectFolderUri.fsPath
                )
            );
        } finally {
            assert.equal(origCwd, process.cwd());
            removeTempProjectDir(projectFolderUri.fsPath);
        }
    });

    test('Open Project: Valid Starter Kit project', async () => {
        const origCwd = process.cwd();
        const extensionUri = Uri.file('whateva');
        const projectFolderUri = Uri.file(await createTempProjectDir());

        // Clone the Starter Kit repo, as shallowly as possible.
        process.chdir(projectFolderUri.fsPath);
        await CommonUtils.executeCommandAsync('git init');
        await CommonUtils.executeCommandAsync(
            'git remote add origin https://github.com/salesforce/offline-app-developer-starter-kit.git'
        );
        await CommonUtils.executeCommandAsync(
            'git fetch origin 99b1fa9377694beb7918580aab445a2e9981f611'
        );
        await CommonUtils.executeCommandAsync(
            'git checkout -b main FETCH_HEAD'
        );
        process.chdir(origCwd);

        try {
            await new ConfigureProjectCommand(
                extensionUri
            ).validateProjectFolder(projectFolderUri);
        } catch (err) {
            assert.fail(`Project should have been valid, but wasn't: ${err}`);
        } finally {
            assert.equal(origCwd, process.cwd());
            removeTempProjectDir(projectFolderUri.fsPath);
        }
    }).timeout(10000);
});
