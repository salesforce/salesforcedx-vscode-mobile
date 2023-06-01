
export class UEMBuilder {

    private cards: any[] = [];

    addGlobalActionCard(): UEMBuilder {
        const listUEM = {
            definition: "mcfp/actionList",
            name: "actions_list",
            label: "Global Actions",
            properties: {},
            regions: {},
        };

        this.cards.push(this.cardUEM("global_actions", "Global Actions", listUEM));
        return this;
    }

    build(): string {
        let uem = this.getUEMTemplate();
        const cmps = uem.view.regions.components.components[0].regions.components.components;
        for (const card of this.cards) {
            cmps.push(card);
        }
        return JSON.stringify(uem, null, 2);
    }

    private cardUEM(name: string, label: string, ...children: any[]): any {
        return {
            definition: "mcf/card",
            name: name,
            properties: { label },
            regions: {
                components: {
                    name: "components",
                    components: children,
                },
            },
        };
    }

    private getUEMTemplate(): any {
        return {
            view: {
                definition: "generated/uem_output",
                name: "view",
                properties: {},
                regions: {
                    components: {
                        name: "components",
                        components: [
                            {
                                definition: "mcf/container",
                                name: "container",
                                properties: {
                                    backgroundColor: "#F3F2f2",
                                },
                                regions: {
                                    components: {
                                        name: "components",
                                        components: [] as any[]
                                    },
                                },
                            },
                        ],
                    },
                },
            },
            target: "mcf__native",
            apiName: "landing_page",
            id: "611ca737-feb2-41c8-8c87-4f48a3415e3b",
        }
    };
}
