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
    Org,
    OrgConfigProperties,
    StateAggregator
} from '@salesforce/core';
import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceUtils } from './workspaceUtils';
import { ObjectInfoRepresentation } from '../types';

const SF_MOBILE_DIR = '.sfMobile';
const ENTITY_LIST_FILE_NAME = 'entity_list.json';
const OBJECT_INFO_FOLDER = 'objectInfos';


enum AuthStatus {
    UNKNOWN,
    AUTHORIZED,
    UNAUTHORIZED
}

class OrgState {
    status: AuthStatus;
    connection?: Connection;
    orgName?: string;

    constructor(status: AuthStatus, connection?: Connection, orgName?: string) {
        this.status = status;
        this.connection = connection;
        this.orgName = orgName;
    }

    // Retrieve objectInfo folder path, which is '<projectRoot>/.sfMobile/orgName'
    getOrgCachePath(): string {
        if (this.orgName === undefined) {
            throw Error('Not authorized to org');
        }
        return path.join(
            path.join(WorkspaceUtils.getWorkspaceDir(), SF_MOBILE_DIR),
            this.orgName
        );
    }

    // Retrieve objectInfo folder path, which is '<projectRoot>/.sfMobile/orgName/objectInfos/'
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

    getEntityFilePath(): string {
        return path.join(
            this.getObjectInfoPath(),
            ENTITY_LIST_FILE_NAME
        )
    }
}

export class OrgUtils {
    private static currentOrgState = new OrgState(AuthStatus.UNAUTHORIZED);

    private static objectInfoInMemoCache = new Map<
        string,
        ObjectInfoRepresentation
    >();
    private static objectInfoPromises = new Map<
        string,
        Promise<ObjectInfoRepresentation | undefined>
    >();
    private static entities: string[] = [];

    // Get default organization's name.
    private static async getDefaultOrg(): Promise<string | undefined> {
        const aggregator = await ConfigAggregator.create();

        await aggregator.reload();

        const targetOrg = aggregator.getInfo(OrgConfigProperties.TARGET_ORG);

        return targetOrg.value ? targetOrg.value.toString() : undefined;
    }

    // Get default user name
    private static async getDefaultUserName(): Promise<string | undefined> {
        try {
            const orgName = await this.getDefaultOrg();
            if (orgName === undefined) {
                return undefined;
            }
            const aggregator = await StateAggregator.getInstance();

            const userName = aggregator.aliases.getUsername(orgName);
            if (userName) {
                return Promise.resolve(userName);
            }
        } catch (error) {
            return undefined;
        }
    }

    // Refresh the org authentication state if needed and return the latest state. 
    // If state changes from unknown to authorized,  it will kick off call to fetch entity list.
    private static async refreshOrgState(): Promise<OrgState> {
        // Already settled, not unknown, no need to refresh.
        if (this.currentOrgState.status !== AuthStatus.UNKNOWN) {
            return this.currentOrgState;
        }

        // Figured out new org state.
        let orgState: OrgState;
        const connection = await this.getConnection();
        if (connection !== undefined) {
            const orgName = await this.getDefaultOrg();
            orgState = new OrgState(AuthStatus.AUTHORIZED, connection, orgName);
        } else {
            orgState = new OrgState(AuthStatus.UNAUTHORIZED);
        }

        // Kick off the call to fetch entity list the user has access to.
        if (orgState.status === AuthStatus.AUTHORIZED) {
            // Fetches entity list once.
            const entityListFile = orgState.getEntityFilePath();
            const entityList = (
                await orgState.connection!!.describeGlobal()
            ).sobjects.map((sObj) => sObj.name);

            this.entities = entityList;
            fs.writeFileSync(entityListFile, JSON.stringify(entityList), {
                mode: 0o666
            });
        }

        this.currentOrgState = orgState;
        return orgState;
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
            this.currentOrgState.getObjectInfoPath(),
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

    // Acquire ObjectInfo data by first searching in memory, then on disk, and finally over the network.
    public static async getObjectInfo(
        objectApiName: string
    ): Promise<ObjectInfoRepresentation | undefined> {
        const orgState = await OrgUtils.refreshOrgState();
        if (orgState.status !== AuthStatus.AUTHORIZED) {
            return undefined;
        }

        const objectInfo = this.getObjectInfoFromCache(objectApiName);
        if (objectInfo !== undefined) {
            return objectInfo;
        }

        // Network loading is going on
        let objectInfoNetworkResponsePromise =
            this.objectInfoPromises.get(objectApiName);
        if (objectInfoNetworkResponsePromise === undefined) {
            objectInfoNetworkResponsePromise = new Promise<
                ObjectInfoRepresentation | undefined
            >(async (resolve) => {
                try {
                    const connection = await OrgUtils.getConnection();
                    if (
                        connection === undefined ||
                        !OrgUtils.entities.includes(objectApiName)
                    ) {
                        return resolve(undefined);
                    }
                    const objectInfo = (await connection.request(
                        `${connection.baseUrl()}/ui-api/object-info/${objectApiName}`
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
            this.currentOrgState.getObjectInfoPath(),
            `${objectApiName}.json`
        );
        if (fs.existsSync(objectInfoFile)) {
            fs.unlinkSync(objectInfoFile);
        }

        fs.writeFileSync(objectInfoFile, objectInfoStr, { mode: 0o666 });
    }

    // Resets Org state to its initial state.
    public static reset() {
        this.currentOrgState = new OrgState(AuthStatus.UNKNOWN);
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
}
