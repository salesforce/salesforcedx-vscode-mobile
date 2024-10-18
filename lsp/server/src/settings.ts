/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { 
    defaultDiagnosticSettings, 
    DiagnosticSettings,
    getSettings as getDiagnosticSettings
} from './diagnostic/DiagnosticSettings';

export interface Settings {
    diagnostic: DiagnosticSettings
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided
// but could happen with other clients.
export const defaultSettings: Settings = { 
    diagnostic: defaultDiagnosticSettings
};

export let globalSettings: Settings = defaultSettings;

/**
 * return a setting for currentSetting and input. 
 * The result setting's individual property value will from current setting 
 * if the property from input is missing or invalid. 
 * @param currentSetting current setting
 * @param input the input to pull setting value from.
 */
export function getSettings(currentSetting: Settings, input: any): Settings {
    const diagnosticSetting = getDiagnosticSettings(currentSetting.diagnostic, input);
    return {
        diagnostic: diagnosticSetting
    }
}