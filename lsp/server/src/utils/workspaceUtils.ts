/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { access } from 'fs/promises';
import { PACKAGE_JSON, SFDX_PROJECT_FILE } from './constants';
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

    static readonly STATIC_RESOURCES_PATH = path.join(
        WorkspaceUtils.DEFAULT_APP_PATH,
        'staticresources'
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

    static readonly QUICK_ACTIONS_PATH = path.join(
        WorkspaceUtils.DEFAULT_APP_PATH,
        'quickActions'
    );

    static readonly LWC_TEMPLATE_PATH = path.join('resources', 'templates');

    static getWorkspaceDir(): string {
        if (!this.workspaceFolders || this.workspaceFolders.length === 0) {
            throw new NoWorkspaceError(
                'No workspace defined for this project.'
            );
        }
        return new URL(this.workspaceFolders[0].uri).pathname;
    }

    static async getStaticResourcesDir(): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            let projectPath: string;
            try {
                projectPath = this.getWorkspaceDir();
            } catch (err) {
                return reject(err);
            }
            const staticResourcesPath = path.join(
                projectPath,
                this.STATIC_RESOURCES_PATH
            );
            try {
                await access(staticResourcesPath);
            } catch (err) {
                const noAccessError = new NoStaticResourcesDirError(
                    `Could not read static resources directory at '${staticResourcesPath}'`
                );

                return reject(noAccessError);
            }
            return resolve(staticResourcesPath);
        });
    }

    static packageJsonExists(): boolean {
        try {
            return fs.existsSync(
                path.join(this.getWorkspaceDir(), PACKAGE_JSON)
            );
        } catch {
            return false;
        }
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

export class NoStaticResourcesDirError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = this.constructor.name;
        Object.setPrototypeOf(this, NoStaticResourcesDirError.prototype);
    }
}
