/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import { SfProjectJson } from '@salesforce/core';

export interface SalesforceProjectConfig {
    getInstance(): Promise<SfProjectJson>;
    getValue(key: string): Promise<any>;
}
