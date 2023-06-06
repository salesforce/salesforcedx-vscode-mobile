/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { messages } from '../messages/messages';
import { Field } from './orgUtils';

export class UEMBuilder {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    static readonly GLOBAL_ACTIONS_LABEL = messages.getMessage(
        'card_name_global_actions'
    );

    // TODO: Create a typed data structure for this instead of any
    private cards: any[] = [];

    static readonly valueTypes = [
        'Int',
        'String',
        'Boolean',
        'ID',
        'DateTime',
        'Time',
        'Date',
        'TextArea',
        'LongTextArea',
        'RichTextArea',
        'PhoneNumber',
        'Email',
        'Url',
        'EncryptedString',
        'Currency',
        'Longitude',
        'Latitude',
        'Picklist',
        'MultiPicklist',
        'Long',
        'Double',
        'Percent',
        'Base64'
    ];

    static readonly defaultValueType = 'StringValue';

    private getFieldType(field: Field): string {
        const t = UEMBuilder.valueTypes.find(
            (t) => t.toLowerCase() === field.type.toLowerCase()
        );

        if (t !== undefined) {
            return t + 'Value';
        }

        // default
        return UEMBuilder.defaultValueType;
    }

    addGlobalActionCard(): UEMBuilder {
        const listUEM = {
            definition: 'mcfp/actionList',
            name: 'actions_list',
            label: UEMBuilder.GLOBAL_ACTIONS_LABEL,
            properties: {},
            regions: {}
        };

        this.cards.push(
            this.cardUEM(
                'global_actions',
                UEMBuilder.GLOBAL_ACTIONS_LABEL,
                listUEM
            )
        );
        return this;
    }

    addRecordListCard(
        objectApiName: string,
        labelPlural: string,
        fieldsToDisplay: Field[],
        orderByField: string = 'Name',
        isAscending: boolean = true,
        size = 3
    ): UEMBuilder {
        const fields: any = {};
        const fieldMap: any = {};

        // add primary field (require at least 1 field)
        fields[fieldsToDisplay[0].apiName] = this.getFieldType(fieldsToDisplay[0]);
        fieldMap.mainField = fieldsToDisplay[0].apiName;

        // add secondary field
        if (fieldsToDisplay.length > 1) {
            fields[fieldsToDisplay[1].apiName] = this.getFieldType(
                fieldsToDisplay[1]
            );
            fieldMap.subField1 = fieldsToDisplay[1].apiName;
        }

        // add tertiary field
        if (fieldsToDisplay.length > 2) {
            fields[fieldsToDisplay[2].apiName] = this.getFieldType(
                fieldsToDisplay[2]
            );
            fieldMap.subField2 = fieldsToDisplay[2].apiName;
        }

        const listUEM = {
            definition: 'mcf/list',
            name: `${objectApiName.toLowerCase()}_list`,
            label: labelPlural,
            properties: {
                size,
                objectApiName,
                orderBy: [{ [orderByField]: isAscending ? 'ASC' : 'DESC' }],
                fields,
                fieldMap
            },
            regions: {
                components: {
                    name: 'components',
                    components: [
                        {
                            definition: 'mcf/recordRow',
                            name: `${objectApiName.toLowerCase()}_row`,
                            label: `${objectApiName} Row`,
                            properties: {},
                            regions: {}
                        }
                    ]
                }
            }
        };

        this.cards.push(this.cardUEM(labelPlural, labelPlural, listUEM));
        return this;
    }

    addTimedListCard(
        sobject: string = 'Account',
        size: number = 5,
        isAscending: boolean = true
    ): UEMBuilder {
        return this;
    }

    build(): any {
        let uem = this.uemTemplate();
        const cmps =
            uem.view.regions.components.components[0].regions.components
                .components;
        for (const card of this.cards) {
            cmps.push(card);
        }
        return uem;
    }

    private cardUEM(name: string, label: string, ...children: any[]): any {
        return {
            definition: 'mcf/card',
            name: name,
            properties: { label },
            regions: {
                components: {
                    name: 'components',
                    components: children
                }
            }
        };
    }

    private uemTemplate(): any {
        return {
            view: {
                definition: 'generated/uem_output',
                name: 'view',
                properties: {},
                regions: {
                    components: {
                        name: 'components',
                        components: [
                            {
                                definition: 'mcf/container',
                                name: 'container',
                                properties: {
                                    backgroundColor: '#F3F2f2'
                                },
                                regions: {
                                    components: {
                                        name: 'components',
                                        components: [] as any[]
                                    }
                                }
                            }
                        ]
                    }
                }
            },
            target: 'mcf__native',
            apiName: 'landing_page',
            id: '611ca737-feb2-41c8-8c87-4f48a3415e3b'
        };
    }
}
