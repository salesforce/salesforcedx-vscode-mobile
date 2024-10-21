/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { SFDX_PROJECT_FILE } from './constants';
import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceFolder } from 'vscode-languageserver';

export class WorkspaceUtils {
    private static workspaceFolders: WorkspaceFolder[] | undefined | null = [];

    static readonly DEFAULT_APP_PATH = path.join(
        'force-app',
        'main',
        'default'
    );

    static readonly LWC_PATH = path.join(
        WorkspaceUtils.DEFAULT_APP_PATH,
        'lwc'
    );

    public static setWorkSpaceFolders(
        workSpaceFolders: WorkspaceFolder[] | null | undefined
    ) {
        this.workspaceFolders = workSpaceFolders;
    }

    // LSP server has a different way to fetch WorkSpaceDir than root project which relis on vscode workspace.
    static getWorkspaceDir(): string {
        if (!this.workspaceFolders || this.workspaceFolders.length === 0) {
            throw new NoWorkspaceError(
                'No workspace defined for this project.'
            );
        }
        return new URL(this.workspaceFolders[0].uri).pathname;
    }

    static lwcFolderExists(): boolean {
        try {
            return fs.existsSync(
                path.join(this.getWorkspaceDir(), WorkspaceUtils.LWC_PATH)
            );
        } catch {
            return false;
        }
    }

    static isSfdxProjectOpened(): boolean {
        try {
            return fs.existsSync(
                path.join(this.getWorkspaceDir(), SFDX_PROJECT_FILE)
            );
        } catch {
            return false;
        }
    }
}

export class NoWorkspaceError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = this.constructor.name;
        Object.setPrototypeOf(this, NoWorkspaceError.prototype);
    }
}
