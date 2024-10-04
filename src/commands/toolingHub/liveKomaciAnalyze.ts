/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as vscode from 'vscode';
import { commands, window, ExtensionContext } from 'vscode';
import { CoreExtensionService } from '../../services/CoreExtensionService';

const commandName = 'salesforcedx-vscode-offline-app.live-komaci-analysis';

export class LiveKomaciAnalyzeCommand {
    static async execute(
        sourceUri: vscode.Uri | vscode.Uri[] | undefined,
        uris: vscode.Uri[] | undefined
    ) {
        const telemetryService = CoreExtensionService.getTelemetryService();

        // Extract LWC Name
        if ((uris && uris?.length > 1) || Array.isArray(sourceUri)) {
            telemetryService.sendException(
                commandName + '.invalid_analysis_input',
                vscode.l10n.t('(TODO) This command runs on a single component.')
            );
            return await window.showErrorMessage(
                vscode.l10n.t('(TODO) This command runs on a single component.')
            );
        }
        const sourceUriInput = sourceUri
            ? sourceUri
            : this.getUriFromActiveEditor();
        const lwcName = this.extractLwcNameFromSourceUri(
            sourceUriInput as vscode.Uri
        );

        // Extract LWC namespace - it's declared in sfdx-project.json
        const config = await CoreExtensionService.getSalesforceProjectConfig();
        let lwcNamespace = await config.getValue('namespace');
        if (!lwcNamespace || lwcNamespace === '') {
            lwcNamespace = 'c'; // Default "c" custom namespace
        }

        telemetryService.sendCommandEvent(commandName, process.hrtime(), {
            lwcName,
            lwcNamespace
        });

        const workspace = await CoreExtensionService.getWorkspaceContext();

        // Deploy LWC so analysis runs against current code
        // TODO: Commented out until TD-0215753 is delivered
        // const result = await vscode.commands.executeCommand('sf.deploy.current.source.file');

        // Open tooling hub in browser
        workspace.getConnection().then((conn) => {
            let toolingHubUrl =
                conn.instanceUrl +
                '/lwr/application/amd/0/e/native/ai/lightningmobileruntime%2Ftoolinghub';
            toolingHubUrl += `?tab=audit&hideContainer=true&lwcName=${lwcName}&lwcNamespace=${lwcNamespace}&hideForm=true&visualize=true`;
            vscode.env.openExternal(toolingHubUrl as any);
        });
    }

    static getUriFromActiveEditor(): vscode.Uri | undefined {
        const editor = vscode.window.activeTextEditor;
        return editor?.document.uri;
    }

    static extractLwcNameFromSourceUri(
        sourceUriInput: vscode.Uri | undefined
    ): string {
        const path = sourceUriInput?.path ?? null;
        if (path && path.indexOf('lwc/') >= 0) {
            return path.split('lwc/')[1].split('/')[0];
        }
        return '';
    }
}

export function registerCommand(context: ExtensionContext) {
    commands.registerCommand(
        commandName,
        async (
            sourceUri: vscode.Uri | vscode.Uri[] | undefined,
            uris: vscode.Uri[] | undefined
        ) => {
            await LiveKomaciAnalyzeCommand.execute(sourceUri, uris);
        }
    );
}
