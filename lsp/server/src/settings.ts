
// Settings for Mobile LSP

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
 * 
 * @param input 
 */
export function getSettings(currentSetting: Settings, input: any): Settings {
    const diagnosticSetting = getDiagnosticSettings(currentSetting.diagnostic, input);
    return {
        diagnostic: diagnosticSetting
    }
}




