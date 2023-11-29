/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { Connection } from '@salesforce/core';
import { Event } from 'vscode';

export interface WorkspaceContext {
    readonly onOrgChange: Event<{
        username?: string;
        alias?: string;
    }>;
    getInstance(forceNew: boolean): WorkspaceContext;
    getConnection(): Promise<Connection>;
    username(): string | undefined;
    alias(): string | undefined;
}
