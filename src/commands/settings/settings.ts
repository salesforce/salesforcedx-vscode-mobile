/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as vscode from 'vscode';

const SETTING_KEY_SUPPRESS_ALL = 'suppressAll';
const SETTING_KEY_SUPPRESS_BY_RULE_ID = 'suppressByRuleId';

export function getUpdateDiagnosticsSettingCommand(
    context: vscode.ExtensionContext
): string {
    return `${context.extension.packageJSON.name}.updateDiagnosticsSetting`;
}

export const SECTION_DIAGNOSTICS = `mobileDiagnostics`;

export function registerCommand(context: vscode.ExtensionContext) {
    const command = getUpdateDiagnosticsSettingCommand(context);
    const disposable = vscode.commands.registerCommand(
        command,
        async (diagnosticSetting) => {
            const config =
                vscode.workspace.getConfiguration(SECTION_DIAGNOSTICS);
            const { suppressAll, suppressByRuleId } = diagnosticSetting;
            if (
                suppressAll !== undefined &&
                (suppressAll === true || suppressAll === false)
            ) {
                await config.update(
                    SETTING_KEY_SUPPRESS_ALL,
                    suppressAll,
                    vscode.ConfigurationTarget.Workspace
                );
            }
            if (
                suppressByRuleId !== undefined &&
                suppressByRuleId instanceof Array
            ) {
                await config.update(
                    SETTING_KEY_SUPPRESS_BY_RULE_ID,
                    suppressByRuleId,
                    vscode.ConfigurationTarget.Workspace
                );
            }
        }
    );
    context.subscriptions.push(disposable);
}
