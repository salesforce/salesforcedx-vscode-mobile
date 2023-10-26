/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as fs from 'fs';
import { mkdir } from 'fs/promises';
import * as path from 'path';
import { workspace, Uri } from 'vscode';
import { SinonStub } from 'sinon';
import { afterEach, beforeEach } from 'mocha';
import { UIUtils } from '../../../../utils/uiUtils';
import {
    TemplateChooserCommand,
    TemplateQuickPickItem,
    NoWorkspaceError,
    NoStaticResourcesDirError
} from '../../../../commands/wizard/templateChooserCommand';
import { TempProjectDirManager } from '../../../TestHelper';

suite('Template Chooser Command Test Suite', () => {
    beforeEach(function () {});

    afterEach(function () {
        sinon.restore();
    });

    // test('Selects a template file and it is copied', async () => {
    //     const showQuickPickStub: SinonStub = sinon.stub(
    //         UIUtils,
    //         'showQuickPick'
    //     );

    //     // set up file picker
    //     const chosenItem: TemplateQuickPickItem = {
    //         label: 'Case Management',
    //         description: 'This is the description',
    //         detail: 'Contains a new case quick action, along with the 5 most recent cases, accounts, and contacts.',
    //         filenamePrefix: 'somefile'
    //     };

    //     showQuickPickStub.onCall(0).returns(chosenItem);

    //     // set up stubs for filesystem copy
    //     const testPath = '/somepath';
    //     const copyFileSyncStub = sinon.stub(fs, 'copyFileSync');
    //     const workspaceFoldersStub = sinon
    //         .stub(workspace, 'workspaceFolders')
    //         .get(() => [{ uri: Uri.file(testPath) }]);

    //     // execute our command
    //     // await TemplateChooserCommand.chooseTemplate();

    //     // ensure copy was performed for both json and metadata files
    //     for (const fileExtension of [
    //         TemplateChooserCommand.LANDING_PAGE_JSON_FILE_EXTENSION,
    //         TemplateChooserCommand.LANDING_PAGE_METADATA_FILE_EXTENSION
    //     ]) {
    //         const expectedSourcePath = path.join(
    //             testPath,
    //             TemplateChooserCommand.STATIC_RESOURCES_PATH,
    //             `somefile${fileExtension}`
    //         );
    //         const expectedDestinationPath = path.join(
    //             testPath,
    //             TemplateChooserCommand.STATIC_RESOURCES_PATH,
    //             `${TemplateChooserCommand.LANDING_PAGE_FILENAME_PREFIX}${fileExtension}`
    //         );
    //         assert.ok(
    //             copyFileSyncStub.calledWith(
    //                 expectedSourcePath,
    //                 expectedDestinationPath
    //             ),
    //             `Should attempt to copy ${expectedSourcePath} to ${expectedDestinationPath}`
    //         );
    //     }
    // });

    test('Nothing is selected', async () => {
        const showQuickPickStub: SinonStub = sinon.stub(
            UIUtils,
            'showQuickPick'
        );

        showQuickPickStub.onCall(0).returns(undefined);

        // execute our command and get the promise to ensure expected value is received.
        // let promise = TemplateChooserCommand.chooseTemplate();
        // let result = await promise;
        // assert.equal(result, undefined);
    });

    test('Static resources dir: workspace does not exist', async () => {
        try {
            await TemplateChooserCommand.getStaticResourcesDir();
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
            TemplateChooserCommand,
            'getWorkspaceDir'
        );
        getWorkspaceDirStub.returns(projectDirMgr.projectDir);
        try {
            await TemplateChooserCommand.getStaticResourcesDir();
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
            TemplateChooserCommand,
            'getWorkspaceDir'
        );
        getWorkspaceDirStub.returns(projectDirMgr.projectDir);

        const staticResourcesAbsPath = path.join(
            projectDirMgr.projectDir,
            TemplateChooserCommand.STATIC_RESOURCES_PATH
        );
        await mkdir(staticResourcesAbsPath, { recursive: true });

        try {
            const outputDir =
                await TemplateChooserCommand.getStaticResourcesDir();
            assert.equal(outputDir, staticResourcesAbsPath);
        } finally {
            await projectDirMgr.removeDir();
            getWorkspaceDirStub.restore();
        }
    });

    test('Landing pages exist: existing landing page file combinations', async () => {
        const projectDirMgr =
            await TempProjectDirManager.createTempProjectDir();
        const getWorkspaceDirStub = sinon.stub(
            TemplateChooserCommand,
            'getWorkspaceDir'
        );
        getWorkspaceDirStub.returns(projectDirMgr.projectDir);
        const staticResourcesAbsPath = path.join(
            projectDirMgr.projectDir,
            TemplateChooserCommand.STATIC_RESOURCES_PATH
        );
        await mkdir(staticResourcesAbsPath, { recursive: true });

        (async () => {
            for (const landingPageType in TemplateChooserCommand.LANDING_PAGE_FILENAME_PREFIXES) {
                for (const fileConfig of [
                    {
                        extensionList: [],
                        result: {
                            jsonFileExists: false,
                            metaFileExists: false
                        }
                    },
                    {
                        extensionList: [
                            TemplateChooserCommand.LANDING_PAGE_JSON_FILE_EXTENSION
                        ],
                        result: {
                            jsonFileExists: true,
                            metaFileExists: false
                        }
                    },
                    {
                        extensionList: [
                            TemplateChooserCommand.LANDING_PAGE_METADATA_FILE_EXTENSION
                        ],
                        result: { jsonFileExists: false, metaFileExists: true }
                    },
                    {
                        extensionList: [
                            TemplateChooserCommand.LANDING_PAGE_JSON_FILE_EXTENSION,
                            TemplateChooserCommand.LANDING_PAGE_METADATA_FILE_EXTENSION
                        ],
                        result: { jsonFileExists: true, metaFileExists: true }
                    }
                ]) {
                    fileConfig.extensionList.forEach((extension) => {
                        const file = path.join(
                            staticResourcesAbsPath,
                            TemplateChooserCommand
                                .LANDING_PAGE_FILENAME_PREFIXES[
                                landingPageType
                            ] + extension
                        );
                        fs.writeFileSync(file, 'blah');
                    });
                    const filesExist =
                        await TemplateChooserCommand.landingPageFilesExist(
                            staticResourcesAbsPath,
                            landingPageType
                        );
                    assert.equal(
                        filesExist.jsonFileExists,
                        fileConfig.result.jsonFileExists
                    );
                    assert.equal(
                        filesExist.metaFileExists,
                        fileConfig.result.metaFileExists
                    );
                    fileConfig.extensionList.forEach((extension) => {
                        const file = path.join(
                            staticResourcesAbsPath,
                            TemplateChooserCommand
                                .LANDING_PAGE_FILENAME_PREFIXES[
                                landingPageType
                            ] + extension
                        );
                        fs.rmSync(file);
                    });
                }
            }
        })().then(async () => {
            await projectDirMgr.removeDir();
            getWorkspaceDirStub.restore();
        });
    });

    test('Choosing existing landing page automatically resolves', async () => {
        const choiceData = {
            landingPageType: 'existing'
        };
        assert.ok(await TemplateChooserCommand.onLandingPageChosen(choiceData));
    });

    test('Choosing existing landing page automatically resolves', async () => {
        const choiceData = {
            landingPageType: 'existing'
        };
        assert.ok(await TemplateChooserCommand.onLandingPageChosen(choiceData));
    });
});

// static async onLandingPageChosen(choiceData: {
//     landingPageType: string;
// }): Promise<boolean> {
//     return new Promise<boolean>(async (resolve, reject) => {
//         const landingPageType = choiceData.landingPageType;

//         // Nothing to do if the user chose to keep their existing landing page.
//         if (landingPageType === 'existing') {
//             return resolve(true);
//         }

//         // If a landing page exists, warn about overwriting it.
//         const staticResourcesPath = await this.getStaticResourcesDir();
//         const existingLandingPageFiles = await this.landingPageFilesExist(
//             staticResourcesPath,
//             'existing'
//         );
//         if (
//             existingLandingPageFiles.jsonFileExists ||
//             existingLandingPageFiles.metaFileExists
//         ) {
//             const confirmOverwrite = await window.showWarningMessage(
//                 l10n.t(
//                     'Are you sure you want to overwrite your existing landing page?'
//                 ),
//                 { modal: true },
//                 l10n.t('Yes'),
//                 l10n.t('No')
//             );
//             if (confirmOverwrite === l10n.t('No')) {
//                 console.info(
//                     'User chose not to overwrite their existing landing page.'
//                 );
//                 return resolve(false);
//             }
//         }

//         // Copy both the json and metadata files.
//         const sourceFilenamePrefix =
//             this.LANDING_PAGE_FILENAME_PREFIXES[landingPageType];
//         const destFilenamePrefix =
//             this.LANDING_PAGE_FILENAME_PREFIXES.existing;
//         for (const fileExtension of [
//             this.LANDING_PAGE_JSON_FILE_EXTENSION,
//             this.LANDING_PAGE_METADATA_FILE_EXTENSION
//         ]) {
//             const sourceFilename = sourceFilenamePrefix + fileExtension;
//             const destFilename = destFilenamePrefix + fileExtension;
//             const sourcePath = path.join(
//                 staticResourcesPath,
//                 sourceFilename
//             );
//             const destinationPath = path.join(
//                 staticResourcesPath,
//                 destFilename
//             );

//             await window.withProgress(
//                 {
//                     location: ProgressLocation.Notification,
//                     title: l10n.t(
//                         "Copying '{0}' to '{1}'",
//                         sourceFilename,
//                         destFilename
//                     )
//                 },
//                 async (_progress, _token) => {
//                     await copyFile(sourcePath, destinationPath);
//                 }
//             );
//         }
//         return resolve(true);
//     });
// }
