/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { ExtensionContext, extensions } from 'vscode';
import { satisfies, valid } from 'semver';
import type { CoreExtensionApi, WorkspaceContext, SalesforceProjectConfig, TelemetryService } from '../types';
import {
    CORE_EXTENSION_ID,
    MINIMUM_REQUIRED_VERSION_CORE_EXTENSION
} from '../utils/constants';

const NOT_INITIALIZED_ERROR = 'CoreExtensionService not initialized';
const CORE_EXTENSION_NOT_FOUND = 'Core extension not found';
const WORKSPACE_CONTEXT_NOT_FOUND = 'Workspace Context not found';
const SALESFORCE_PROJECT_CONFIG_NOT_FOUND = 'SalesforceProjectConfig not found';
const TELEMETRY_SERVICE_NOT_FOUND = 'TelemetryService not found';
const coreExtensionMinRequiredVersionError =
    'You are running an older version of the Salesforce CLI Integration VSCode Extension. Please update the Salesforce Extension pack and try again.';

export class CoreExtensionService {
    private static initialized = false;
    private static workspaceContext: WorkspaceContext;
    private static salesforceProjectConfig: SalesforceProjectConfig;
    private static telemetryService: TelemetryService;

    static loadDependencies(context : ExtensionContext) {
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

            CoreExtensionService.initializeSalesforceProjectConfig(
                coreExtensionApi?.services.SalesforceProjectConfig
            );

            CoreExtensionService.initializeTelemetryService(
                coreExtensionApi?.services.TelemetryService, context
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

    private static initializeSalesforceProjectConfig(
        salesforceProjectConfig: SalesforceProjectConfig | undefined
    ) {
        if (!salesforceProjectConfig) {
            throw new Error(SALESFORCE_PROJECT_CONFIG_NOT_FOUND);
        }
        CoreExtensionService.salesforceProjectConfig = salesforceProjectConfig;
    }

    private static initializeTelemetryService(
        telemetryService: TelemetryService | undefined, context: ExtensionContext
    ) {
        if (!telemetryService) {
          throw new Error(TELEMETRY_SERVICE_NOT_FOUND);
        }
        const { aiKey, name, version } = context.extension.packageJSON;
        CoreExtensionService.telemetryService = telemetryService.getInstance(name);
        CoreExtensionService.telemetryService.initializeService(context, name, aiKey, version);
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

    static getSalesforceProjectConfig(): SalesforceProjectConfig {
        if (CoreExtensionService.initialized) {
            return CoreExtensionService.salesforceProjectConfig;
        }
        throw new Error(NOT_INITIALIZED_ERROR);
    }

    static getTelemetryService(): TelemetryService {
        if (CoreExtensionService.initialized) {
          return CoreExtensionService.telemetryService;
        }
        throw new Error(NOT_INITIALIZED_ERROR);
    }
}
