/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

export type AuthFields = {
    accessToken?: string;
    alias?: string;
    authCode?: string;
    clientId?: string;
    clientSecret?: string;
    created?: string;
    createdOrgInstance?: string;
    devHubUsername?: string;
    instanceUrl?: string;
    instanceApiVersion?: string;
    instanceApiVersionLastRetrieved?: string;
    isDevHub?: boolean;
    loginUrl?: string;
    orgId?: string;
    password?: string;
    privateKey?: string;
    refreshToken?: string;
    scratchAdminUsername?: string;
    snapshot?: string;
    userId?: string;
    username?: string;
    usernames?: string[];
    userProfileName?: string;
    expirationDate?: string;
    tracksSource?: boolean;
};
