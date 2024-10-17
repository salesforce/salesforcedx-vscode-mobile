    /*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

export type DiagnosticId = 
    | 'missspelled-uiapi' 
    | 'adapters-local-change-not-aware'; 

/**
 * data structure for diagnostic suppression configuration.
 */
export type DiagnosticSettings = {
    maxNumberOfProblems: number;
    suppressAll?: boolean;
    suppressedRuleIds?: Set<DiagnosticId>
}

/**
 * Check if the individual diagnostic should be suppressed.
 * @param settings The suppression config
 * @param id The configuration id to check.
 * @returns True if suppressed.
 */
export function isTheDiagnosticSuppressed(settings: DiagnosticSettings, id: DiagnosticId) {
    return settings.suppressAll === true || settings.suppressedRuleIds?.has(id);
}

export const defaultDiagnosticSettings: DiagnosticSettings = {
    maxNumberOfProblems: 1000
}

/**
 * Take in input, possibly a diagnostic json setting true and get valid settings 
 * @param input the input, a well format tree is like 
 * 
 *  {
            "suppress.all": true,
            "suppressed.rule.Ids": ["adapters-local-change-not-aware"],
            "maxProblemNumber": 50
    }
 * 
 * @returns 
 */
export function getSettings(input: any): DiagnosticSettings {
    const maxNumberOfProblems = parseInt(input['maxProblemNumber']);
    const suppressAll = input['suppress.all'] === true || input['suppress.all'] === true;
    const inputIdArray = input['suppressed.rule.Ids'];
    const suppressedRuleIds = inputIdArray instanceof Array? new Set(inputIdArray): new Set();
    return {
        maxNumberOfProblems: isNaN(maxNumberOfProblems)?defaultDiagnosticSettings.maxNumberOfProblems:maxNumberOfProblems,
        suppressAll,
        suppressedRuleIds
    };
}