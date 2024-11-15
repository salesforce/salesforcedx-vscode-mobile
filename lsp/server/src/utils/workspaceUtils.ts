/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { SFDX_PROJECT_FILE } from './constants';
import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceFolder } from 'vscode-languageserver';

export class WorkspaceUtils {
    // WorkspaceFolders is null if Workspace is not configured
    private static workspaceFolders: WorkspaceFolder[] | null;

    static readonly DEFAULT_APP_PATH = path.join(
        'force-app',
        'main',
        'default'
    );

    static readonly LWC_PATH = path.join(
        WorkspaceUtils.DEFAULT_APP_PATH,
        'lwc'
    );

    /**
     * WorkspaceFolders must be initialized before they can be used.
     * @param workspaceFolders workspaceFolders passed from LSP server connection.
     */
    public static initWorkspaceFolders(
        workspaceFolders: WorkspaceFolder[] | null | undefined
    ) {
        if (workspaceFolders === undefined) {
            throw new Error('LSP client does no support workspace folder');
        }
        this.workspaceFolders = workspaceFolders;
    }

    // The LSP server uses a different method to retrieve the WorkSpaceDir than the root project, which depends on the VSCode workspace.
    static getWorkspaceDir(): string {
        if (
            this.workspaceFolders === null ||
            this.workspaceFolders.length === 0
        ) {
            throw new Error('No workspace defined for this project.');
        }
        return new URL(this.workspaceFolders[0].uri).pathname;
    }

    static lwcFolderExists(): boolean {
        return this.isWorkSpacePathExists(WorkspaceUtils.LWC_PATH);
    }

    private static isWorkSpacePathExists(filePath: string): boolean {
        try {
            return fs.existsSync(path.join(this.getWorkspaceDir(), filePath));
        } catch {
            return false;
        }
    }

    static isSfdxProjectOpened(): boolean {
        return this.isWorkSpacePathExists(SFDX_PROJECT_FILE);
    }
}
