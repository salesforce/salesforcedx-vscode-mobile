/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import {
    AuthInfo,
    ConfigAggregator,
    Connection,
    OrgConfigProperties,
    StateAggregator
} from '@salesforce/core';
import * as fs from 'fs';
import * as path from 'path';
import { ObjectInfoRepresentation } from '../types';
import { ServerWorkspace } from './serverWorkspace';

const SF_MOBILE_DIR = '.sfMobile';
const ENTITY_LIST_FILE_NAME = 'entity_list.json';
const OBJECT_INFO_FOLDER = 'objectInfos';

enum AuthStatus {
    UNKNOWN,
    AUTHORIZED,
    UNAUTHORIZED
}

class OrgInfo {
    status: AuthStatus;
    connection?: Connection;
    orgName?: string;

    constructor(status: AuthStatus, connection?: Connection, orgName?: string) {
        this.status = status;
        this.connection = connection;
        this.orgName = orgName;
    }

    // Get org caching root folder path, which is '<projectRoot>/.sfMobile/orgName'
    getOrgCachePath(): string {
        if (this.orgName === undefined) {
            throw Error('Not authorized to org');
        }
        return path.join(
            path.join(ServerWorkspace.getWorkspaceDir(), SF_MOBILE_DIR),
            this.orgName
        );
    }

    // Get objectInfo folder path, which is '<projectRoot>/.sfMobile/orgName/objectInfos/'
    getObjectInfoPath(): string {
        const objectInfoPath = path.join(
            this.getOrgCachePath(),
            OBJECT_INFO_FOLDER
        );
        if (!fs.existsSync(objectInfoPath)) {
            fs.mkdirSync(objectInfoPath, { recursive: true });
        }
        return objectInfoPath;
    }

    // Get the file path for entity list.
    getEntityFilePath(): string {
        return path.join(this.getObjectInfoPath(), ENTITY_LIST_FILE_NAME);
    }

    getObjectInfoRestEndPoint(objectApiName: string): string {
        if (this.connection === undefined) {
            throw Error('Not authorized to org');
        }
        return `${this.connection.baseUrl()}/ui-api/object-info/${objectApiName}`;
    }
}

/**
 * Utility class for managing ObjectInfo
 * - fetching data and cache it in L1 and L2 for authorized org
 * - wipe out data when logout.
 */
export class ObjectInfoUtils {
    private static defaultOrgInfo = new OrgInfo(AuthStatus.UNAUTHORIZED);

    private static objectInfoInMemoCache = new Map<
        string,
        ObjectInfoRepresentation
    >();
    private static objectInfoPromises = new Map<
        string,
        Promise<ObjectInfoRepresentation | undefined>
    >();
    private static entities: string[] = [];

    // Acquire ObjectInfo data by first searching in memory, then on disk, and finally over the network.
    public static async getObjectInfo(
        objectApiName: string
    ): Promise<ObjectInfoRepresentation | undefined> {
        const orgInfo = await ObjectInfoUtils.refreshOrgInfo();
        if (orgInfo.status !== AuthStatus.AUTHORIZED) {
            return undefined;
        }

        const objectInfo = this.getObjectInfoFromCache(objectApiName);
        if (objectInfo !== undefined) {
            return objectInfo;
        }

        // kick off a network call if not going already.
        let objectInfoNetworkResponsePromise =
            this.objectInfoPromises.get(objectApiName);
        if (objectInfoNetworkResponsePromise === undefined) {
            objectInfoNetworkResponsePromise = new Promise<
                ObjectInfoRepresentation | undefined
            >(async (resolve) => {
                try {
                    const connection = await ObjectInfoUtils.getConnection();
                    if (
                        connection === undefined ||
                        !ObjectInfoUtils.entities.includes(objectApiName)
                    ) {
                        return resolve(undefined);
                    }
                    const url =
                        orgInfo.getObjectInfoRestEndPoint(objectApiName);
                    const objectInfo = (await connection.request(
                        url
                    )) as ObjectInfoRepresentation;

                    if (objectInfo !== undefined) {
                        this.objectInfoResponseCallback(
                            objectApiName,
                            objectInfo
                        );
                    }
                    return resolve(objectInfo);
                } catch (e) {
                    console.log(
                        `Failed to load entity list from server with error: ${e}`
                    );
                    return resolve(undefined); // Return undefined in case of an error
                }
            }).finally(() => {
                this.objectInfoPromises.delete(objectApiName);
            });
            this.objectInfoPromises.set(
                objectApiName,
                objectInfoNetworkResponsePromise
            );
        }
        return objectInfoNetworkResponsePromise;
    }

    // Resets Org state to its initial state and wipe out L1 and L2 cache.
    public static reset() {
        this.defaultOrgInfo = new OrgInfo(AuthStatus.UNKNOWN);
        this.entities.splice(0, this.entities.length);
        this.objectInfoInMemoCache.clear();
        this.objectInfoPromises.clear();
        try {
            fs.rmSync(SF_MOBILE_DIR, {
                force: true,
                recursive: true,
                maxRetries: 3
            });
        } catch (e) {
            console.log(e);
        }
    }

    // Get default organization's name.
    private static async getDefaultOrg(): Promise<string | undefined> {
        const aggregator = await ConfigAggregator.create();

        await aggregator.reload();

        const targetOrg = aggregator.getInfo(OrgConfigProperties.TARGET_ORG);

        return targetOrg.value ? targetOrg.value.toString() : undefined;
    }

    // Get default user name
    private static async getDefaultUserName(): Promise<string | undefined> {
        const orgName = await this.getDefaultOrg();
        if (orgName === undefined) {
            return undefined;
        }

        const aggregator = await StateAggregator.getInstance();
        const userName = aggregator.aliases.getUsername(orgName);
        if (userName) {
            return userName;
        }
        return undefined;
    }

    // Refresh the org info if needed and return the latest state.
    // If state changes from unknown to authorized,  it will kick off call to fetch entity list.
    private static async refreshOrgInfo(): Promise<OrgInfo> {
        // Already settled, not unknown, no need to refresh.
        if (this.defaultOrgInfo.status !== AuthStatus.UNKNOWN) {
            return this.defaultOrgInfo;
        }

        // Figured out new org state.
        let orgInfo: OrgInfo;
        const connection = await this.getConnection();
        if (connection !== undefined) {
            const orgName = await this.getDefaultOrg();
            orgInfo = new OrgInfo(AuthStatus.AUTHORIZED, connection, orgName);
        } else {
            orgInfo = new OrgInfo(AuthStatus.UNAUTHORIZED);
        }

        // Kick off the call to fetch entity list the user has access to.
        if (orgInfo.status === AuthStatus.AUTHORIZED) {
            // Fetches entity list once.
            const entityListFile = orgInfo.getEntityFilePath();
            const entityList = (
                await orgInfo.connection!!.describeGlobal()
            ).sobjects.map((sObj) => sObj.name);

            this.entities = entityList;
            fs.writeFileSync(entityListFile, JSON.stringify(entityList), {
                mode: 0o666
            });
        }

        this.defaultOrgInfo = orgInfo;
        return orgInfo;
    }

    // Retrieve the Connection which fetches ObjectInfo remotely.
    private static async getConnection(): Promise<Connection | undefined> {
        try {
            const username = await this.getDefaultUserName();
            if (username === undefined) {
                return undefined;
            }
            const connect = await Connection.create({
                authInfo: await AuthInfo.create({ username })
            });
            if (connect !== undefined && connect.getUsername() !== undefined) {
                return connect;
            }
            return undefined;
        } catch (error) {
            return undefined;
        }
    }

    private static fetchObjectInfoFromDisk(
        objectApiName: string
    ): ObjectInfoRepresentation | undefined {
        const objectInfoJsonFile = path.join(
            this.defaultOrgInfo.getObjectInfoPath(),
            `${objectApiName}.json`
        );
        if (!fs.existsSync(objectInfoJsonFile)) {
            return undefined;
        }

        const objectInfoStr = fs.readFileSync(objectInfoJsonFile, 'utf-8');
        return JSON.parse(objectInfoStr) as ObjectInfoRepresentation;
    }

    private static getObjectInfoFromCache(
        objectApiName: string
    ): ObjectInfoRepresentation | undefined {
        // Check mem cache
        let objectInfo = this.objectInfoInMemoCache.get(objectApiName);

        if (objectInfo !== undefined) {
            return objectInfo;
        }

        // Check disk cache
        objectInfo = this.fetchObjectInfoFromDisk(objectApiName);
        if (objectInfo !== undefined) {
            this.objectInfoInMemoCache.set(objectApiName, objectInfo);
            return objectInfo;
        }
        return undefined;
    }

    /**
     * Callback for getObject info network call.  It puts the response in L1 and L2.
     */
    private static objectInfoResponseCallback(
        objectApiName: string,
        objectInfo: ObjectInfoRepresentation
    ) {
        this.objectInfoInMemoCache.set(objectApiName, objectInfo);
        const objectInfoStr = JSON.stringify(objectInfo);
        const objectInfoFile = path.join(
            this.defaultOrgInfo.getObjectInfoPath(),
            `${objectApiName}.json`
        );
        if (fs.existsSync(objectInfoFile)) {
            fs.unlinkSync(objectInfoFile);
        }

        fs.writeFileSync(objectInfoFile, objectInfoStr, { mode: 0o666 });
    }
}
