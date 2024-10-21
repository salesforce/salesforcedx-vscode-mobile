/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

const SETTING_KEY_SUPPRESS_ALL = 'suppressAll';
const SETTING_KEY_SUPPRESS_BY_RULE_ID = 'suppressByRuleId';

/**
 * data structure for diagnostic suppression configuration.
 */
export type DiagnosticSettings = {
    suppressAll?: boolean;
    suppressByRuleId?: Set<string>
}

/**
 * Check if the individual diagnostic should be suppressed.
 * @param settings The suppression config
 * @param producerId The producer id to check.
 * @returns True if suppressed.
 */
export function isTheDiagnosticSuppressed(settings: DiagnosticSettings, producerId: string) {
    return settings.suppressAll === true || settings.suppressByRuleId?.has(producerId);
}

export const defaultDiagnosticSettings: DiagnosticSettings = {
    suppressAll: false,
    suppressByRuleId: new Set()
}

/**
 * Take in currentSetting and an input, return a new diagnosticSettings
 * @param currentSetting the current setting
 * @param input the input, a well format tree is like 
 * 
 *  {
            "suppressAll": true,
            "suppressByRuleId": ["adapters-local-change-not-aware"],
    }
 * 
 * @returns the settings for diagnostics
 */
export function getSettings(currentSetting: DiagnosticSettings, input: any): DiagnosticSettings {
    if (input === undefined) {
        return currentSetting;
    }
    // pull the values from input
    const suppressAll = input[SETTING_KEY_SUPPRESS_ALL] === true?true:(input[SETTING_KEY_SUPPRESS_ALL] === false?false:undefined);
    const inputIdArray = input[SETTING_KEY_SUPPRESS_BY_RULE_ID];
    const suppressedRuleIds = inputIdArray instanceof Array? new Set(inputIdArray): new Set();
    
    // take value currentSetting if value pulled from input is missing or invalid.
    return {
        suppressAll: suppressAll === undefined? currentSetting.suppressAll: suppressAll,
        suppressByRuleId: suppressedRuleIds
    };
}
