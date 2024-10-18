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
    suppressedIds?: Set<DiagnosticId>
}

/**
 * Check if the individual diagnostic should be suppressed.
 * @param settings The suppression config
 * @param id The configuration id to check.
 * @returns True if suppressed.
 */
export function isTheDiagnosticSuppressed(settings: DiagnosticSettings, id: DiagnosticId) {
    return settings.suppressAll === true || settings.suppressedIds?.has(id);
}

export const defaultDiagnosticSettings: DiagnosticSettings = {
    suppressAll: false,
    suppressedIds: new Set(),
    maxNumberOfProblems: 200,
}

/**
 * Take in input, possibly a diagnostic json setting true and get valid settings 
 * @param input the input, a well format tree is like 
 * 
 *  {
            "salesforce.salesforcedx-vscode-mobile.diagnostics.suppressAll": true,
            "salesforce.salesforcedx-vscode-mobile.diagnostics.suppressedIds": ["adapters-local-change-not-aware"],
            "salesforce.salesforcedx-vscode-mobile.diagnostics.maxProblemNumber": 50
    }
 * 
 * @returns 
 */
export function getSettings(currentSetting: DiagnosticSettings, input: any): DiagnosticSettings {
    if (input === undefined) {
        return currentSetting;
    }
    const maxNumberOfProblems = parseInt(input['maxProblemNumber']);
    const suppressAll = input['suppressAll'] === true?true:(input['suppressAll'] === false?false:undefined);
    const inputIdArray = input['suppressed.rule.Ids'];
    const suppressedRuleIds = inputIdArray instanceof Array? new Set(inputIdArray): new Set();
    return {
        maxNumberOfProblems: isNaN(maxNumberOfProblems)? currentSetting.maxNumberOfProblems : maxNumberOfProblems,
        suppressAll: suppressAll === undefined? currentSetting.suppressAll: suppressAll,
        suppressedIds: suppressedRuleIds
    };
}