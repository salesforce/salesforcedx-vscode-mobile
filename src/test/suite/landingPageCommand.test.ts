import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { LandingPageCommand } from '../../landingPage/landingPageCommand';
import { SObject } from '../../landingPage/orgUtils';
import { SinonStub } from 'sinon';
import { afterEach, beforeEach } from 'mocha';

suite('Landing Page Command Test Suite', () => {

    beforeEach(function () {
    });

    afterEach(function () {
        sinon.restore();
    });

    test('Returns default with no cards', async () => {
        const showQuickPickStub: SinonStub = sinon.stub(vscode.window, 'showQuickPick');
        showQuickPickStub.resolves({ label: LandingPageCommand.FINISHED_LABEL });

        const json = await LandingPageCommand.buildLandingPage();

        const cards = json.view.regions.components.components[0].regions.components.components;
        assert.equal(cards.length, 0);
    });

    test('Adds global actions card', async () => {
        const showQuickPickStub: SinonStub = sinon.stub(vscode.window, 'showQuickPick');
        showQuickPickStub.onCall(0).returns({ label: LandingPageCommand.GLOBAL_ACTIONS_CARD_LABEL });
        showQuickPickStub.onCall(1).returns({ label: LandingPageCommand.FINISHED_LABEL });

        const json = await LandingPageCommand.buildLandingPage();

        const globalCard = json.view.regions.components.components[0].regions.components.components[0];
        assert.equal(globalCard.name, "global_actions");
    });

    test('Adds record list card', async () => {
        const showQuickPickStub: SinonStub = sinon.stub(vscode.window, 'showQuickPick');
        const sobject: SObject = {
            apiName: 'SomeApiName',
            label: 'SomeObject',
            labelPlural: 'SomeObjects'
        };
        showQuickPickStub.onCall(0).returns({ label: LandingPageCommand.RECORD_LIST_CARD_LABEL });
        showQuickPickStub.onCall(1).returns({ label: sobject.apiName, sobject: sobject });
        showQuickPickStub.onCall(2).returns({ label: LandingPageCommand.FINISHED_LABEL });

        const json = await LandingPageCommand.buildLandingPage();

        const recordListCard = json.view.regions.components.components[0].regions.components.components[0];
        const recordListUEM = recordListCard.regions.components.components[0];
        // ensure we added a card with a list component
        assert.equal(recordListUEM.definition, "mcf/list");
        assert.equal(recordListUEM.name, `${sobject.apiName.toLowerCase()}_list`);
        assert.equal(recordListUEM.label, sobject.labelPlural);
        assert.equal(recordListUEM.properties.size, 3);
        assert.equal(recordListUEM.properties.objectApiName, sobject.apiName);
        assert.equal(recordListUEM.properties.objectApiName, sobject.apiName);

        const fields = recordListUEM.properties.fields;
        const fieldMap = recordListUEM.properties.fieldMap;

        const rowMap = recordListUEM.regions.components.components[0];
        assert.equal(rowMap.definition, "mcf/recordRow");
        assert.equal(rowMap.name, `${sobject.apiName.toLowerCase()}_row`);
        assert.equal(rowMap.label, `${sobject.apiName} Row`);
    });
});
