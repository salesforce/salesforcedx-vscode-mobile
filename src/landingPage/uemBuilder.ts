import { messages } from '../messages/messages';

export class UEMBuilder {
    cards: any[] = [];

    // eslint-disable-next-line @typescript-eslint/naming-convention
    static readonly GLOBAL_ACTIONS_LABEL = messages.getMessage(
        'card_name_global_actions'
    );

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
