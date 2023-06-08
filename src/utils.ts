import {
    ConfigAggregator,
    Org,
    OrgConfigProperties
} from '@salesforce/core';

export interface SObject {
    apiName: string;
    label: string;
    labelPlural: string;
}

export class OrgUtils {
    public static async getSobjects(): Promise<SObject[]> {
        try {
            const org = await Org.create();
            const conn = org.getConnection();
            const result = await conn.describeGlobal();

            const sobjects = result.sobjects
                .map((sobject) => {
                    const so: SObject = {
                        apiName: sobject.name,
                        label: sobject.label,
                        labelPlural: sobject.labelPlural
                    };
                    return so;
                })
                .sort((a, b) => a.apiName.localeCompare(b.apiName));
            return Promise.resolve(sobjects);
        } catch (error) {
            console.log(error);
            return Promise.reject(error);
        }
    }

    public static async getDefaultUser(): Promise<string> {
        const aggregator = await ConfigAggregator.create();
        const currentUserConfig = aggregator.getInfo(
            OrgConfigProperties.TARGET_ORG
        );
        const currentUser = currentUserConfig.value
            ? currentUserConfig.value
            : 'undefined';
        return Promise.resolve(currentUser.toString());
    }
}
