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
import { l10n, Uri, window } from 'vscode';
import {
    ConfigureProjectCommand,
    DefaultProjectConfigurationProcessor,
    ProjectConfigurationProcessor
} from '../../../../src/commands/wizard/configureProjectCommand';
import {
    TempProjectDirManager,
    createPlatformAbsolutePath
} from '../../../TestHelper';

suite('Configure Project Command Test Suite', () => {
    beforeEach(function () {});

    afterEach(function () {
        sinon.restore();
    });

    test('Open Project: Non-existent folder is an error', async () => {
        const origCwd = process.cwd();
        const extensionUri = Uri.file('whateva');
        const nonExistentFolderUri = Uri.file(
            createPlatformAbsolutePath(
                'starter-kit-tests',
                'path',
                'to',
                'nowhere'
            )
        );
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
        const projectFolder =
            await TempProjectDirManager.createTempProjectDir();
        const projectFolderUri = Uri.file(projectFolder.projectDir);
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
            projectFolder.removeDir();
        }
    });

    test('Open Project: Project is not a git repo', async () => {
        const origCwd = process.cwd();
        const extensionUri = Uri.file('whateva');
        const projectFolder =
            await TempProjectDirManager.createTempProjectDir();
        const projectFolderUri = Uri.file(projectFolder.projectDir);

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
            projectFolder.removeDir();
        }
    });

    test('Open Project: Project is not the Starter Kit git repo', async () => {
        const origCwd = process.cwd();
        const extensionUri = Uri.file('whateva');
        const projectFolder =
            await TempProjectDirManager.createTempProjectDir();
        const projectFolderUri = Uri.file(projectFolder.projectDir);

        // Create a skeleton git repo
        process.chdir(projectFolderUri.fsPath);
        await CommonUtils.executeCommandAsync('git init');
        await writeFile(path.join(process.cwd(), 'README.txt'), 'Some content');
        await CommonUtils.executeCommandAsync('git add README.txt');

        try {
            await CommonUtils.executeCommandAsync(
                'git config --global user.email'
            );
        } catch {
            await CommonUtils.executeCommandAsync(
                'git config --global user.email "you@example.com"'
            );
        }

        try {
            await CommonUtils.executeCommandAsync(
                'git config --global user.name'
            );
        } catch {
            await CommonUtils.executeCommandAsync(
                'git config --global user.name "Your Name"'
            );
        }

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
            projectFolder.removeDir();
        }
    });

    test('Open Project: Valid Starter Kit project', async () => {
        const origCwd = process.cwd();
        const extensionUri = Uri.file('whateva');
        const projectFolder =
            await TempProjectDirManager.createTempProjectDir();
        const projectFolderUri = Uri.file(projectFolder.projectDir);

        // Clone the Starter Kit repo, as shallowly as possible.
        process.chdir(projectFolderUri.fsPath);
        await CommonUtils.executeCommandAsync('git init');
        await CommonUtils.executeCommandAsync(
            `git remote add origin ${ConfigureProjectCommand.STARTER_KIT_REPO_URI}`
        );
        await CommonUtils.executeCommandAsync(
            `git fetch origin ${ConfigureProjectCommand.STARTER_KIT_INITIAL_COMMIT}`
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
            projectFolder.removeDir();
        }
    }).timeout(60000); // 1 min, just to be safe. This test should ideally land < 10s.

    test('Canceling "Create Project" should not resolve. Subsequent choice should.', async () => {
        const extensionUri = Uri.file('whateva');
        const configurationProcessor = new DefaultProjectConfigurationProcessor(
            extensionUri
        );
        const configureProjectCmd = new ConfigureProjectCommand(
            extensionUri,
            configurationProcessor
        );

        const fakeProjectPath = createPlatformAbsolutePath(
            'fake',
            'project',
            'path'
        );
        const folderPathStub = setupCreateProjectCancellationStubs(
            configurationProcessor,
            fakeProjectPath
        );

        // We're looking for the promise *not* to be resolved in this case, so
        // we'll have our fake promise resolve first.
        const timeoutProjectPath = createPlatformAbsolutePath(
            'timeout',
            'project',
            'path'
        );
        const timeout = 500;
        let timeoutPromise = new Promise<string>((resolve) => {
            setTimeout(() => {
                resolve(timeoutProjectPath);
            }, timeout);
        });

        let resultPath = await Promise.race([
            configureProjectCmd.createProjectAction(),
            timeoutPromise
        ]);
        assert.equal(
            resultPath,
            timeoutProjectPath,
            'New project cancel should not resolve promise.'
        );

        // Subsequently choosing a non-null folder path should resolve
        // the Promise.
        folderPathStub.restore();
        sinon
            .stub(configurationProcessor, 'getProjectFolderPath')
            .callsFake(() => {
                return new Promise((resolve) => {
                    const projectPathUri = Uri.file(fakeProjectPath);
                    return resolve([projectPathUri]);
                });
            });

        // Have to recreate the timoeut promise, as the original promise
        // was already resolved above.
        timeoutPromise = new Promise<string>((resolve) => {
            setTimeout(() => {
                resolve(timeoutProjectPath);
            }, timeout);
        });

        resultPath = await Promise.race([
            configureProjectCmd.createProjectAction(),
            timeoutPromise
        ]);
        assert.equal(
            resultPath,
            fakeProjectPath,
            'Valid new project path should resolve promise.'
        );
    });

    test('Canceling "Open Project" should not resolve. Subsequent choice should.', async () => {
        const extensionUri = Uri.file('whateva');
        const configurationProcessor = new DefaultProjectConfigurationProcessor(
            extensionUri
        );
        const configureProjectCmd = new ConfigureProjectCommand(
            extensionUri,
            configurationProcessor
        );

        const fakeProjectPath = createPlatformAbsolutePath(
            'fake',
            'project',
            'path'
        );
        const folderPathStub = setupOpenProjectCancellationStubs(
            configureProjectCmd,
            configurationProcessor,
            fakeProjectPath
        );

        // We're looking for the promise *not* to be resolved in this case, so
        // we'll have our fake promise resolve first.
        const timeoutProjectPath = createPlatformAbsolutePath(
            'timeout',
            'project',
            'path'
        );
        const timeout = 500;
        let timeoutPromise = new Promise<string>((resolve) => {
            setTimeout(() => {
                resolve(timeoutProjectPath);
            }, timeout);
        });

        let resultPath = await Promise.race([
            configureProjectCmd.openProjectAction(),
            timeoutPromise
        ]);
        assert.equal(
            resultPath,
            timeoutProjectPath,
            'Open project cancel should not resolve promise.'
        );

        // Subsequently choosing a non-null folder path should resolve
        // the Promise.
        folderPathStub.restore();
        sinon
            .stub(configurationProcessor, 'getProjectFolderPath')
            .callsFake(() => {
                return new Promise((resolve) => {
                    const projectPathUri = Uri.file(fakeProjectPath);
                    return resolve([projectPathUri]);
                });
            });

        // Have to recreate the timoeut promise, as the original promise
        // was already resolved above.
        timeoutPromise = new Promise<string>((resolve) => {
            setTimeout(() => {
                resolve(timeoutProjectPath);
            }, timeout);
        });

        resultPath = await Promise.race([
            configureProjectCmd.openProjectAction(),
            timeoutPromise
        ]);
        assert.equal(
            resultPath,
            fakeProjectPath,
            'Valid open project path should resolve promise.'
        );
    });

    test('Invalid folder for "Open Project" should not resolve. Subsequent choice should.', async () => {
        const extensionUri = Uri.file('whateva');
        const configurationProcessor = new DefaultProjectConfigurationProcessor(
            extensionUri
        );
        const configureProjectCmd = new ConfigureProjectCommand(
            extensionUri,
            configurationProcessor
        );

        const fakeProjectPath = createPlatformAbsolutePath(
            'fake',
            'project',
            'path'
        );
        const validateFolderStub = setupOpenProjectInvalidFolderStubs(
            configureProjectCmd,
            configurationProcessor,
            fakeProjectPath
        );

        // We're looking for the promise *not* to be resolved in this case, so
        // we'll have our fake promise resolve first.
        const timeoutProjectPath = createPlatformAbsolutePath(
            'timeout',
            'project',
            'path'
        );
        const timeout = 500;
        let timeoutPromise = new Promise<string>((resolve) => {
            setTimeout(() => {
                resolve(timeoutProjectPath);
            }, timeout);
        });

        let resultPath = await Promise.race([
            configureProjectCmd.openProjectAction(),
            timeoutPromise
        ]);
        assert.equal(
            resultPath,
            timeoutProjectPath,
            'Open project with invalid folder should not resolve promise.'
        );

        // Subsequently choosing a valid folder path should resolve
        // the Promise.
        validateFolderStub.restore();
        sinon
            .stub(configureProjectCmd, 'validateProjectFolder')
            .callsFake(() => {
                return new Promise((resolve) => {
                    return resolve();
                });
            });

        // Have to recreate the timoeut promise, as the original promise
        // was already resolved above.
        timeoutPromise = new Promise<string>((resolve) => {
            setTimeout(() => {
                resolve(timeoutProjectPath);
            }, timeout);
        });

        resultPath = await Promise.race([
            configureProjectCmd.openProjectAction(),
            timeoutPromise
        ]);
        assert.equal(
            resultPath,
            fakeProjectPath,
            'Valid open project path should resolve promise.'
        );
    });
});

function setupCreateProjectCancellationStubs(
    configurationProcessor: ProjectConfigurationProcessor,
    fakeProjectPath: string
): sinon.SinonStub {
    // getProjectFolderPath() returning undefined is equivalent to the user
    // canceling the operation.
    const folderPathStub = sinon
        .stub(configurationProcessor, 'getProjectFolderPath')
        .callsFake(() => {
            return new Promise((resolve) => {
                return resolve(undefined);
            });
        });

    sinon
        .stub(configurationProcessor, 'preActionUserAcknowledgment')
        .callsFake(() => {
            return new Promise((resolve) => {
                return resolve();
            });
        });

    sinon
        .stub(configurationProcessor, 'executeProjectCreation')
        .callsFake(() => {
            return new Promise((resolve) => {
                return resolve(fakeProjectPath);
            });
        });

    return folderPathStub;
}

function setupOpenProjectCancellationStubs(
    configureProjectCmd: ConfigureProjectCommand,
    configurationProcessor: ProjectConfigurationProcessor,
    fakeProjectPath: string
): sinon.SinonStub {
    // getProjectFolderPath() returning undefined is equivalent to the user
    // canceling the operation.
    const folderPathStub = sinon
        .stub(configurationProcessor, 'getProjectFolderPath')
        .callsFake(() => {
            return new Promise((resolve) => {
                return resolve(undefined);
            });
        });

    sinon.stub(configureProjectCmd, 'validateProjectFolder').callsFake(() => {
        return new Promise((resolve) => {
            return resolve();
        });
    });

    sinon
        .stub(configurationProcessor, 'preActionUserAcknowledgment')
        .callsFake(() => {
            return new Promise((resolve) => {
                return resolve();
            });
        });

    sinon.stub(configurationProcessor, 'executeProjectOpen').callsFake(() => {
        return new Promise((resolve) => {
            return resolve();
        });
    });

    return folderPathStub;
}

function setupOpenProjectInvalidFolderStubs(
    configureProjectCmd: ConfigureProjectCommand,
    configurationProcessor: ProjectConfigurationProcessor,
    fakeProjectPath: string
): sinon.SinonStub {
    // getProjectFolderPath() returning undefined is equivalent to the user
    // canceling the operation.
    sinon.stub(configurationProcessor, 'getProjectFolderPath').callsFake(() => {
        return new Promise((resolve) => {
            return resolve([Uri.file(fakeProjectPath)]);
        });
    });

    const validateFolderStub = sinon
        .stub(configureProjectCmd, 'validateProjectFolder')
        .callsFake(() => {
            return new Promise((_resolve, reject) => {
                return reject(new Error('Invalid folder in test.'));
            });
        });

    sinon.stub(window, 'showErrorMessage');

    sinon
        .stub(configurationProcessor, 'preActionUserAcknowledgment')
        .callsFake(() => {
            return new Promise((resolve) => {
                return resolve();
            });
        });

    sinon.stub(configurationProcessor, 'executeProjectOpen').callsFake(() => {
        return new Promise((resolve) => {
            return resolve();
        });
    });

    return validateFolderStub;
}
