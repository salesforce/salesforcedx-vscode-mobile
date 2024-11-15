/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { Stats } from 'fs';
import { mkdtemp, rm, stat } from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as process from 'process';
import * as sinon from 'sinon';
import { WorkspaceUtils } from '../src/utils/workspaceUtils';

import { readFileSync } from 'fs';
import {
    ConfigAggregator,
    StateAggregator,
    Connection,
    AuthInfo
} from '@salesforce/core';
import { ServerWorkspace } from '../src/lsp/server/utils/serverWorkspace';

const testOrgConfig = {
    key: 'target-org',
    value: 'testOrg'
};

const noOrgConfig = {
    key: 'target-org'
};

export class TempProjectDirManager {
    readonly projectDir: string;

    private constructor(projectDir: string) {
        this.projectDir = projectDir;
    }

    async removeDir(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            let projectDirStats: Stats;
            try {
                projectDirStats = await stat(this.projectDir);
            } catch (err) {
                return reject(
                    `Project dir '${this.projectDir}' does not exist or is inaccessible.`
                );
            }
            if (!projectDirStats.isDirectory()) {
                return reject(
                    `Project dir '${this.projectDir}' is not a directory.`
                );
            }
            await rm(this.projectDir, { recursive: true, force: true });
            return resolve();
        });
    }

    static async createTempProjectDir(): Promise<TempProjectDirManager> {
        return new Promise(async (resolve, reject) => {
            try {
                const projectDir = await mkdtemp(
                    path.join(os.tmpdir(), 'offlineWizard-')
                );
                return resolve(new TempProjectDirManager(projectDir));
            } catch (err) {
                return reject(err);
            }
        });
    }
}

// Create a platform-agnostic absolute path to a non-existent folder.
export function createPlatformAbsolutePath(...pathArgs: string[]): string {
    const topLevel = path.parse(process.cwd()).root;
    let absPath = path.join(topLevel, ...pathArgs);

    // On Windows, Uri.fsPath normalizes the drive letter down to lower-case.
    // If we don't do the same, tests will break.
    if (process.platform.startsWith('win')) {
        const firstChar = absPath.charAt(0).toLowerCase();
        absPath = firstChar + absPath.slice(1);
    }
    return absPath;
}

// Create a stub of WorkspaceUtis.getWorkspaceDir() that returns a path to
// a temporary directory.
export function setupTempWorkspaceDirectoryStub(
    projectDirManager: TempProjectDirManager,
    sandbox?: sinon.SinonSandbox
): sinon.SinonStub<[], string> {
    const getWorkspaceDirStub = (sandbox ?? sinon).stub(WorkspaceUtils, 'getWorkspaceDir');
    getWorkspaceDirStub.returns(projectDirManager.projectDir);
    return getWorkspaceDirStub;
}

export function setupServerWorkspaceDirectoryStub(
    projectDirManager: TempProjectDirManager,
    sandbox?: sinon.SinonSandbox
): sinon.SinonStub<[], string> {
    const getWorkspaceDirStub = (sandbox ?? sinon).stub(ServerWorkspace, 'getWorkspaceDir');
    getWorkspaceDirStub.returns(projectDirManager.projectDir);
    return getWorkspaceDirStub;
}

export function stubCreateConfig(
    sandbox: sinon.SinonSandbox,
    orgExist: boolean
) {
    const mockConfigAggregator = {
        getInfo: sandbox.stub().returns(orgExist ? testOrgConfig : noOrgConfig),
        reload: sandbox.stub().resolves()
    };
    return sandbox
        .stub(ConfigAggregator, 'create')
        .resolves(mockConfigAggregator as unknown as ConfigAggregator);
}

export function stubGetInstanceState(
    sandbox: sinon.SinonSandbox,
    userExists: boolean
) {
    const mockStateAggregator = {
        aliases: {
            getUsername: sandbox
                .stub()
                .returns(userExists ? 'tester' : undefined)
        }
    };
    return sandbox
        .stub(StateAggregator, 'getInstance')
        .resolves(mockStateAggregator as unknown as StateAggregator);
}

export function stubCreateAuth(sandbox: sinon.SinonSandbox) {
    return sandbox.stub(AuthInfo, 'create').resolves({} as unknown as AuthInfo);
}

export function stubCreateConnection(
    sandbox: sinon.SinonSandbox,
    requestable: boolean
) {
    const account = JSON.parse(readFileSync('test/suite/lsp/server/testFixture/objectInfos/Account.json', 'utf-8'));
    const mockRequest = sandbox.stub().resolves(account);
    const mockConnection = requestable
        ? {
              getUsername: sandbox.stub().returns('tester'),
              // connection which returns 'Account'
              request: mockRequest,
              baseUrl: sandbox.stub().returns('http://sf/testOrg'),
              describeGlobal: sandbox
                  .stub()
                  .resolves({ sobjects: [{ name: 'Account' }] })
          }
        : {
              getUsername: sandbox.stub().returns(undefined)
          };
    const connectionStub = sandbox.stub(Connection, 'create');
    connectionStub.resolves(mockConnection as unknown as Connection);

    return { connectionStub, requestStub: mockRequest };
}

