import * as assert from 'assert';
import { UEMBuilder } from '../../landingPage/uemBuilder';

suite('UEM Builder Test Suite', () => {
    test('Build returns default with no cards', async () => {
        const builder = new UEMBuilder();

        const uem = builder.build();

        let cards =
            uem.view.regions.components.components[0].regions.components
                .components;
        assert.equal(cards.length, 0);
    });

    test('Global Action card is present', async () => {
        const builder = new UEMBuilder();

        builder.addGlobalActionCard();
        const uem = builder.build();
        let cards =
            uem.view.regions.components.components[0].regions.components
                .components;
        assert.equal(cards.length, 1);
        assert.equal(cards[0].name, 'global_actions');
    });
});
