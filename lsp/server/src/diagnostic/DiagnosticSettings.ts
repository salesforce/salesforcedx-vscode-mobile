/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

export type ProducerId = 
    | 'misspelled-uiapi' 
    | 'adapters-local-change-not-aware'; 

/**
 * data structure for diagnostic suppression configuration.
 */
export type DiagnosticSettings = {
    maxNumberOfProblems: number;
    suppressAll?: boolean;
    suppressedIds?: Set<ProducerId>
}

/**
 * Check if the individual diagnostic should be suppressed.
 * @param settings The suppression config
 * @param id The configuration id to check.
 * @returns True if suppressed.
 */
export function isTheDiagnosticSuppressed(settings: DiagnosticSettings, id: ProducerId) {
    return settings.suppressAll === true || settings.suppressedIds?.has(id);
}

export const defaultDiagnosticSettings: DiagnosticSettings = {
    suppressAll: false,
    suppressedIds: new Set(),
    maxNumberOfProblems: 200,
}

/**
 * Take in currentSetting and an input, return a new diagnosticSettings
 * @param currentSetting the current setting
 * @param input the input, a well format tree is like 
 * 
 *  {
            "suppressAll": true,
            "suppressedIds": ["adapters-local-change-not-aware"],
            "maxProblemNumber": 50
    }
 * 
 * @returns the settings for diagnostics
 */
export function getSettings(currentSetting: DiagnosticSettings, input: any): DiagnosticSettings {
    if (input === undefined) {
        return currentSetting;
    }
    // pull the values from input
    const maxNumberOfProblems = parseInt(input['maxProblemNumber']);
    const suppressAll = input['suppressAll'] === true?true:(input['suppressAll'] === false?false:undefined);
    const inputIdArray = input['suppressedIds'];
    const suppressedRuleIds = inputIdArray instanceof Array? new Set(inputIdArray): new Set();
    
    // take value currentSetting if value pulled from input is missing or invalid.
    return {
        maxNumberOfProblems: isNaN(maxNumberOfProblems)? currentSetting.maxNumberOfProblems : maxNumberOfProblems,
        suppressAll: suppressAll === undefined? currentSetting.suppressAll: suppressAll,
        suppressedIds: suppressedRuleIds
    };
}