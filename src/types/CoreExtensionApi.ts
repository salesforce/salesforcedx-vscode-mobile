/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { WorkspaceContext } from './WorkspaceContext';
import { SalesforceProjectConfig } from './SalesforceProjectConfig';
import { TelemetryService } from './TelemetryService';

export interface CoreExtensionApi {
    services: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        WorkspaceContext: WorkspaceContext;
        // eslint-disable-next-line @typescript-eslint/naming-convention
        SalesforceProjectConfig: SalesforceProjectConfig;
        // eslint-disable-next-line @typescript-eslint/naming-convention
        TelemetryService: TelemetryService;
    };
}
