/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as vscode from 'vscode';
import { getExtensionName } from '../../utils/workspaceUtils';

export function getUpdateDiagnosticsSettingCommand(
    context: vscode.ExtensionContext
): string {
    return `${getExtensionName(context)}.updateDiagnosticsSetting`;
}

export function getDiagnosticsSettingSection(
    context: vscode.ExtensionContext
): string {
    return `${getExtensionName(context)}.diagnostics`;
}

export function registerCommand(context: vscode.ExtensionContext) {
    const command = getUpdateDiagnosticsSettingCommand(context);
    context.subscriptions.push(
        vscode.commands.registerCommand(command, async (diagnosticSetting) => {
            const section = getDiagnosticsSettingSection(context);
            const config = vscode.workspace.getConfiguration(section);
            try {
                const { suppressAll, suppressByRuleId, maxNumberOfProblems } =
                    diagnosticSetting;
                if (
                    suppressAll !== undefined &&
                    (suppressAll === true || suppressAll === false)
                ) {
                    await config.update(
                        'suppressAll',
                        suppressAll,
                        vscode.ConfigurationTarget.Workspace
                    );
                }
                if (
                    suppressByRuleId !== undefined &&
                    suppressByRuleId instanceof Array
                ) {
                    await config.update(
                        'suppressByRuleId',
                        suppressByRuleId,
                        vscode.ConfigurationTarget.Workspace
                    );
                }
                if (maxNumberOfProblems !== undefined) {
                    const maxCount = Number.parseInt(maxNumberOfProblems);
                    if (maxCount >= 0) {
                        await config.update(
                            'maxNumberOfProblems',
                            maxNumberOfProblems,
                            vscode.ConfigurationTarget.Workspace
                        );
                    }
                }
            } catch (error) {
                const i = 100;
            }
        })
    );
}
