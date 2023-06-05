import { messages } from '../messages/messages';

interface Field {
    name: string;
    type: string;
}

export class UEMBuilder {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    static readonly GLOBAL_ACTIONS_LABEL = messages.getMessage(
        'card_name_global_actions'
    );

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

    // TODO: This defaults the name field to "Name" but not all sobjects have a "Name" field. We need
    // to iterate over all fields and actually LOOK for isNameField=true and use that. ie, ServiceApptName.
    // BUT, what are the product requirements here? Do we really want to force Name field?
    addRecordListCard(
        objectApiName: string,
        labelPlural: string,
        nameField: Field = {
            name: 'Name',
            type: 'String'
        },
        primaryField: Field | undefined = undefined,
        secondaryField: Field | undefined = undefined,
        orderByField: string = 'Name',
        isAscending: boolean = true,
        size = 3
    ): UEMBuilder {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const fields: { [key: string]: string } = {
            Name: this.getFieldType(nameField)
        };

        const fieldMap: { [key: string]: string } = {
            mainField: nameField.name
        };

        if (primaryField !== undefined) {
            fields[primaryField.name] = this.getFieldType(primaryField);
            fieldMap.subField1 = primaryField.name;
        }

        if (secondaryField !== undefined) {
            fields[secondaryField.name] = this.getFieldType(secondaryField);
            fieldMap.subField2 = secondaryField.name;
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
