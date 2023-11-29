/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { WorkspaceContext } from './WorkspaceContext';

export interface CoreExtensionApi {
    services: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        WorkspaceContext: WorkspaceContext;
    };
}
