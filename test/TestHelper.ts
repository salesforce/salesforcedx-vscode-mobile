/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as path from 'path';
import * as process from 'process';
import * as sinon from 'sinon';
import { WorkspaceUtils } from '../src/utils/workspaceUtils';
import { TempProjectDirManager } from 'mobile-lsp-server';
export { TempProjectDirManager };

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
    projectDirManager: TempProjectDirManager
): sinon.SinonStub<[], string> {
    const getWorkspaceDirStub = sinon.stub(WorkspaceUtils, 'getWorkspaceDir');
    getWorkspaceDirStub.returns(projectDirManager.projectDir);
    return getWorkspaceDirStub;
}