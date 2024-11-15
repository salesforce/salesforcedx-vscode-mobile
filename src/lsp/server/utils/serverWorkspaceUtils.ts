/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */    

import { WorkspaceFolder } from 'vscode-languageserver';

export class ServerWorkspaceUtils {
    private static workspaceFolders: WorkspaceFolder[] | null;

    /**
     * WorkspaceFolders must be initialized before they can be used.
     * @param workspaceFolders workspaceFolders passed from LSP server connection.
     */
    static initWorkspaceFolders(
        workspaceFolders: WorkspaceFolder[] | null | undefined
    ) {
        if (workspaceFolders === undefined) {
            throw new Error('LSP client requires workspace folder.');
        }
        this.workspaceFolders = workspaceFolders;
    }

    // The LSP server uses a different method to retrieve the WorkSpaceDir than the root project, which depends on the VSCode workspace.
    static getWorkspaceDir(): string {
        if (
            this.workspaceFolders === null ||
            this.workspaceFolders.length === 0
        ) {
            throw new Error('No workspace defined for the server.');
        }
        return new URL(this.workspaceFolders[0].uri).pathname;
    }
}

