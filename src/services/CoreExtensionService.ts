/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { extensions } from 'vscode';
import { satisfies, valid } from 'semver';
import type {
    CoreExtensionApi,
    WorkspaceContext
} from '../types';
import {
    CORE_EXTENSION_ID,
    MINIMUM_REQUIRED_VERSION_CORE_EXTENSION
} from '../utils/constants';

const NOT_INITIALIZED_ERROR = 'CoreExtensionService not initialized';
const CORE_EXTENSION_NOT_FOUND = 'Core extension not found';
const WORKSPACE_CONTEXT_NOT_FOUND = 'Workspace Context not found';
const coreExtensionMinRequiredVersionError =
    'You are running an older version of the Salesforce CLI Integration VSCode Extension. Please update the Salesforce Extension pack and try again.';

export class CoreExtensionService {
    private static initialized = false;
    private static workspaceContext: WorkspaceContext;

    static loadDependencies() {
        if (!CoreExtensionService.initialized) {
            const coreExtension = extensions.getExtension(CORE_EXTENSION_ID);
            if (!coreExtension) {
                throw new Error(CORE_EXTENSION_NOT_FOUND);
            }
            const coreExtensionVersion = coreExtension.packageJSON.version;
            if (
                !CoreExtensionService.isAboveMinimumRequiredVersion(
                    MINIMUM_REQUIRED_VERSION_CORE_EXTENSION,
                    coreExtensionVersion
                )
            ) {
                throw new Error(coreExtensionMinRequiredVersionError);
            }

            const coreExtensionApi = coreExtension.exports as CoreExtensionApi;

            CoreExtensionService.initializeWorkspaceContext(
                coreExtensionApi?.services.WorkspaceContext
            );

            CoreExtensionService.initialized = true;
        }
    }

    private static initializeWorkspaceContext(
        workspaceContext: WorkspaceContext | undefined
    ) {
        if (!workspaceContext) {
            throw new Error(WORKSPACE_CONTEXT_NOT_FOUND);
        }
        CoreExtensionService.workspaceContext =
            workspaceContext.getInstance(false);
    }

    private static isAboveMinimumRequiredVersion(
        minRequiredVersion: string,
        actualVersion: string
    ) {
        // Check to see if version is in the expected MAJOR.MINOR.PATCH format
        if (!valid(actualVersion)) {
            console.debug(
                'Invalid version format found for the Core Extension.' +
                    `\nActual version: ${actualVersion}` +
                    `\nMinimum required version: ${minRequiredVersion}`
            );
        }
        return satisfies(actualVersion, '>=' + minRequiredVersion);
    }

    static getWorkspaceContext(): WorkspaceContext {
        if (CoreExtensionService.initialized) {
            return CoreExtensionService.workspaceContext;
        }
        throw new Error(NOT_INITIALIZED_ERROR);
    }
}
