import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { LandingPageCommand } from '../../landingPage/landingPageCommand';
import { SinonStub } from 'sinon';
import { afterEach, beforeEach, suiteSetup, suiteTeardown } from 'mocha';

suite('Landing Page Command Test Suite', () => {

    beforeEach(function () {
    });
    
    afterEach(function () {
        sinon.restore();
    });

    test('Returns default with no cards', async () => {
        const showQuickPickStub: SinonStub = sinon.stub(vscode.window, 'showQuickPick');
        showQuickPickStub.resolves({ label: LandingPageCommand.FINISHED_LABEL });

        const json = await LandingPageCommand.execute();

        const cards = json.view.regions.components.components[0].regions.components.components;
        assert.equal(cards.length, 0);
    });

    test('Adds global actions card', async () => {
        const showQuickPickStub: SinonStub = sinon.stub(vscode.window, 'showQuickPick');
        showQuickPickStub.onCall(0).returns({ label: LandingPageCommand.GLOBAL_ACTIONS_CARD_LABEL });
        showQuickPickStub.onCall(1).returns({ label: LandingPageCommand.FINISHED_LABEL });

        const json = await LandingPageCommand.execute();

        const globalCard = json.view.regions.components.components[0].regions.components.components[0];
        assert.equal(globalCard.name, "global_actions");
    });
});
