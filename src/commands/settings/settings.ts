/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as vscode from 'vscode';
import { CORE_EXTENSION_ID } from '../../utils/constants';
import { getExtensionId } from '../../utils/workspaceUtils';

export function getUpdateDiagnosticsSettingCommand(context: vscode.ExtensionContext): string {
    return `${getExtensionId(context)}.updateDiagnosticsSetting`
};

export function getDiagnosticsSettingSection(context: vscode.ExtensionContext): string {
    return `${getExtensionId(context)}.diagnostics`; 
};

export function registerCommand(context: vscode.ExtensionContext) {
    const command = getUpdateDiagnosticsSettingCommand(context); 
    context.subscriptions.push(vscode.commands.registerCommand(
        command,
        async (diagnosticSetting) => {
            const section = getDiagnosticsSettingSection(context);
            const config = vscode.workspace.getConfiguration(section);
            try {
                const {suppressAll, suppressedIds, maxProblemNumber } = diagnosticSetting;
                if (suppressAll!== undefined && (suppressAll === true || suppressAll === false)) {
                    await config.update('suppressAll', diagnosticSetting, vscode.ConfigurationTarget.Workspace);
                }
                if (suppressedIds !== undefined && suppressedIds instanceof Array) {
                    await config.update('suppressedIds', diagnosticSetting, vscode.ConfigurationTarget.Workspace);
                }
                if (maxProblemNumber !== undefined) {
                    const maxCount = Number.parseInt(maxProblemNumber);
                    if (maxCount >= 0) {
                        await config.update('maxProblemNumber', diagnosticSetting, vscode.ConfigurationTarget.Workspace);
                    }
                }
            } catch(error) {
                const i = 100;
            }
        }
    ));
}