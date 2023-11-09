/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import { mkdir } from 'fs/promises';
import { afterEach, beforeEach } from 'mocha';
import {
    TemplateChooserCommand,
    LandingPageType
} from '../../../../commands/wizard/templateChooserCommand';
import { TempProjectDirManager } from '../../../TestHelper';
import { UIUtils } from '../../../../utils/uiUtils';

type LandingPageTestIOConfig = {
    [landingPageType in LandingPageType]?: {
        [exists in 'jsonExists' | 'metaExists']: boolean;
    };
};

suite('Template Chooser Command Test Suite', () => {
    beforeEach(function () {});

    afterEach(function () {
        sinon.restore();
    });

    test('Landing pages exist: existing landing page file combinations', async () => {
        const projectDirMgr =
            await TempProjectDirManager.createTempProjectDir();
        const getWorkspaceDirStub = sinon.stub(UIUtils, 'getWorkspaceDir');
        getWorkspaceDirStub.returns(projectDirMgr.projectDir);
        const staticResourcesAbsPath = path.join(
            projectDirMgr.projectDir,
            UIUtils.STATIC_RESOURCES_PATH
        );
        await mkdir(staticResourcesAbsPath, { recursive: true });

        (async () => {
            for (const lptIndex in TemplateChooserCommand.LANDING_PAGE_FILENAME_PREFIXES) {
                const landingPageType = lptIndex as LandingPageType;
                const fileConfigList: LandingPageTestIOConfig[] = [
                    {
                        [landingPageType]: {
                            jsonExists: false,
                            metaExists: false
                        }
                    },
                    {
                        [landingPageType]: {
                            jsonExists: true,
                            metaExists: false
                        }
                    },
                    {
                        [landingPageType]: {
                            jsonExists: false,
                            metaExists: true
                        }
                    },
                    {
                        [landingPageType]: {
                            jsonExists: true,
                            metaExists: true
                        }
                    }
                ];
                for (const fileConfig of fileConfigList) {
                    createLandingPageContent(
                        fileConfig,
                        staticResourcesAbsPath
                    );
                    const filesExist =
                        await TemplateChooserCommand.landingPageFilesExist(
                            staticResourcesAbsPath,
                            landingPageType
                        );
                    assert.equal(
                        filesExist.jsonFileExists,
                        fileConfig[landingPageType]!.jsonExists
                    );
                    assert.equal(
                        filesExist.metaFileExists,
                        fileConfig[landingPageType]!.metaExists
                    );
                    deleteLandingPageContent(
                        fileConfig,
                        staticResourcesAbsPath
                    );
                }
            }
        })().then(async () => {
            await projectDirMgr.removeDir();
            getWorkspaceDirStub.restore();
        });
    });

    test('Choosing existing landing page automatically resolves', async () => {
        const choiceData: { landingPageType: LandingPageType } = {
            landingPageType: 'existing'
        };
        assert.ok(await TemplateChooserCommand.onLandingPageChosen(choiceData));
    });

    test('User is asked to overwrite existing landing page', async () => {
        const projectDirMgr =
            await TempProjectDirManager.createTempProjectDir();
        const getWorkspaceDirStub = sinon.stub(UIUtils, 'getWorkspaceDir');
        getWorkspaceDirStub.returns(projectDirMgr.projectDir);
        const staticResourcesAbsPath = path.join(
            projectDirMgr.projectDir,
            UIUtils.STATIC_RESOURCES_PATH
        );
        await mkdir(staticResourcesAbsPath, { recursive: true });
        const config: LandingPageTestIOConfig = {
            existing: {
                jsonExists: true,
                metaExists: false
            }
        };
        createLandingPageContent(config, staticResourcesAbsPath);

        const askUserToOverwriteStub = sinon.stub(
            TemplateChooserCommand,
            'askUserToOverwriteLandingPage'
        );
        askUserToOverwriteStub.returns(
            new Promise((resolve) => {
                return resolve('No');
            })
        );
        const choiceData: { landingPageType: LandingPageType } = {
            landingPageType: 'caseManagement'
        };
        const pageChosen =
            await TemplateChooserCommand.onLandingPageChosen(choiceData);
        assert.ok(
            askUserToOverwriteStub.called,
            'User should have been asked if they wanted to overwrite the existing landing page.'
        );
        assert.equal(
            pageChosen,
            false,
            'Choice was not to overwrite existing page.'
        );

        askUserToOverwriteStub.restore();
        await projectDirMgr.removeDir();
        getWorkspaceDirStub.restore();
    });

    test('Landing page template written to landing page files', async () => {
        const projectDirMgr =
            await TempProjectDirManager.createTempProjectDir();
        const getWorkspaceDirStub = sinon.stub(
            TemplateChooserCommand,
            'getWorkspaceDir'
        );
        getWorkspaceDirStub.returns(projectDirMgr.projectDir);
        const staticResourcesAbsPath = path.join(
            projectDirMgr.projectDir,
            UIUtils.STATIC_RESOURCES_PATH
        );
        await mkdir(staticResourcesAbsPath, { recursive: true });

        const landingPageIoConfig: LandingPageTestIOConfig = {
            default: {
                jsonExists: true,
                metaExists: true
            },
            caseManagement: {
                jsonExists: true,
                metaExists: true
            },
            healthcare: {
                jsonExists: true,
                metaExists: true
            },
            retail: {
                jsonExists: true,
                metaExists: true
            }
        };
        createLandingPageContent(landingPageIoConfig, staticResourcesAbsPath);

        (async () => {
            for (const lptIndex in TemplateChooserCommand.LANDING_PAGE_FILENAME_PREFIXES) {
                const landingPageType = lptIndex as LandingPageType;
                if (landingPageType === 'existing') {
                    continue;
                }
                const copied = await TemplateChooserCommand.onLandingPageChosen(
                    { landingPageType }
                );
                assert.ok(
                    copied,
                    `Landing page for type '${landingPageType}' should have been copied.`
                );
                for (const landingPageExtension of [
                    TemplateChooserCommand.LANDING_PAGE_JSON_FILE_EXTENSION,
                    TemplateChooserCommand.LANDING_PAGE_METADATA_FILE_EXTENSION
                ]) {
                    const fileName =
                        TemplateChooserCommand.LANDING_PAGE_FILENAME_PREFIXES
                            .existing + landingPageExtension;
                    const readContent = fs.readFileSync(
                        path.join(staticResourcesAbsPath, fileName),
                        { encoding: 'utf-8' }
                    );
                    assert.equal(
                        readContent,
                        `${landingPageType} ${landingPageExtension} content`
                    );
                }
            }
        })().then(async () => {
            await projectDirMgr.removeDir();
            getWorkspaceDirStub.restore();
        });
    });

    test('Landing page status: staticresources does not exist', async () => {
        const status = await TemplateChooserCommand.getLandingPageStatus();
        assert.ok(status.error && status.error.length > 0);
    });

    test('Landing page status: various file existence scenarios', async () => {
        const projectDirMgr =
            await TempProjectDirManager.createTempProjectDir();
        const getWorkspaceDirStub = sinon.stub(UIUtils, 'getWorkspaceDir');
        getWorkspaceDirStub.returns(projectDirMgr.projectDir);
        const staticResourcesAbsPath = path.join(
            projectDirMgr.projectDir,
            UIUtils.STATIC_RESOURCES_PATH
        );
        await mkdir(staticResourcesAbsPath, { recursive: true });
        const landingPageConfig: LandingPageTestIOConfig = {
            existing: {
                jsonExists: false,
                metaExists: false
            },
            default: {
                jsonExists: true,
                metaExists: false
            },
            caseManagement: {
                jsonExists: false,
                metaExists: true
            },
            healthcare: {
                jsonExists: true,
                metaExists: true
            },
            retail: {
                jsonExists: false,
                metaExists: false
            }
        };

        createLandingPageContent(landingPageConfig, staticResourcesAbsPath);

        const landingPageStatus =
            await TemplateChooserCommand.getLandingPageStatus();
        for (const lptIndex in landingPageConfig) {
            const landingPageType = lptIndex as LandingPageType;
            const config = landingPageConfig[landingPageType]!;
            const landingPageCollectionStatus =
                landingPageStatus.landingPageCollection[landingPageType]!;
            if (config.jsonExists && config.metaExists) {
                assert.equal(landingPageCollectionStatus.exists, true);
                assert.ok(!landingPageCollectionStatus.warning);
            } else {
                assert.equal(landingPageCollectionStatus.exists, false);
                assert.ok(
                    landingPageCollectionStatus.warning &&
                        landingPageCollectionStatus.warning.length > 0
                );
            }
        }

        await projectDirMgr.removeDir();
        getWorkspaceDirStub.restore();
    });
});

function writeLandingPageFile(
    landingPageType: LandingPageType,
    landingPageExtension: string,
    staticResourcesPath: string
) {
    const fileContent = `${landingPageType} ${landingPageExtension} content`;
    const fileName =
        TemplateChooserCommand.LANDING_PAGE_FILENAME_PREFIXES[landingPageType] +
        landingPageExtension;
    fs.writeFileSync(path.join(staticResourcesPath, fileName), fileContent);
}

function createLandingPageContent(
    landingPageIOConfig: LandingPageTestIOConfig,
    staticResourcesPath: string
) {
    for (const lptIndex in landingPageIOConfig) {
        const landingPageType = lptIndex as LandingPageType;
        if (landingPageIOConfig[landingPageType]!.jsonExists) {
            writeLandingPageFile(
                landingPageType,
                TemplateChooserCommand.LANDING_PAGE_JSON_FILE_EXTENSION,
                staticResourcesPath
            );
        }
        if (landingPageIOConfig[landingPageType]!.metaExists) {
            writeLandingPageFile(
                landingPageType,
                TemplateChooserCommand.LANDING_PAGE_METADATA_FILE_EXTENSION,
                staticResourcesPath
            );
        }
    }
}

function deleteLandingPageFile(
    landingPageType: LandingPageType,
    landingPageExtension: string,
    staticResourcesPath: string
) {
    const fileName =
        TemplateChooserCommand.LANDING_PAGE_FILENAME_PREFIXES[landingPageType] +
        landingPageExtension;
    fs.rmSync(path.join(staticResourcesPath, fileName));
}

function deleteLandingPageContent(
    landingPageIOConfig: LandingPageTestIOConfig,
    staticResourcesPath: string
) {
    for (const lptIndex in landingPageIOConfig) {
        const landingPageType = lptIndex as LandingPageType;
        if (landingPageIOConfig[landingPageType]!.jsonExists) {
            deleteLandingPageFile(
                landingPageType,
                TemplateChooserCommand.LANDING_PAGE_JSON_FILE_EXTENSION,
                staticResourcesPath
            );
        }
        if (landingPageIOConfig[landingPageType]!.metaExists) {
            deleteLandingPageFile(
                landingPageType,
                TemplateChooserCommand.LANDING_PAGE_METADATA_FILE_EXTENSION,
                staticResourcesPath
            );
        }
    }
}
