import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { LandingPageCommand } from '../../landingPage/landingPageCommand';
import { OrgUtils, SObject } from '../../landingPage/orgUtils';
import { SinonStub } from 'sinon';
import { afterEach, beforeEach } from 'mocha';
import { UIUtils } from '../../landingPage/uiUtils';
import { UEMBuilder } from '../../landingPage/uemBuilder';

suite('Landing Page Command Test Suite', () => {
    beforeEach(function () {});

    afterEach(function () {
        sinon.restore();
    });

    test('Returns default with no cards', async () => {
        const showQuickPickStub: SinonStub = sinon.stub(
            vscode.window,
            'showQuickPick'
        );
        showQuickPickStub.resolves({
            label: LandingPageCommand.FINISHED_LABEL
        });

        const json = await LandingPageCommand.buildLandingPage();

        const cards =
            json.view.regions.components.components[0].regions.components
                .components;
        assert.equal(cards.length, 0);
    });

    test('Adds global actions card', async () => {
        const showQuickPickStub: SinonStub = sinon.stub(
            vscode.window,
            'showQuickPick'
        );
        showQuickPickStub
            .onCall(0)
            .returns({ label: LandingPageCommand.GLOBAL_ACTIONS_CARD_LABEL });
        showQuickPickStub
            .onCall(1)
            .returns({ label: LandingPageCommand.FINISHED_LABEL });

        const json = await LandingPageCommand.buildLandingPage();

        const globalCard =
            json.view.regions.components.components[0].regions.components
                .components[0];
        assert.equal(globalCard.name, 'global_actions');
    });

    test('Adds record list card', async () => {
        const showQuickPickStub: SinonStub = sinon.stub(
            UIUtils,
            'showQuickPick'
        );

        // set up sobject picker
        const sobject: SObject = {
            apiName: 'SomeApiName',
            label: 'SomeObject',
            labelPlural: 'SomeObjects'
        };
        showQuickPickStub
            .onCall(0)
            .returns({ label: sobject.labelPlural, detail: sobject.apiName });

        // set up 3 field pickers
        // stub the orgutils call to get list of fields
        const orgUtilsStub = sinon.stub(OrgUtils, 'getFieldsForSObject');
        const sobjectFields = [
            {
                apiName: 'City',
                label: 'City',
                type: 'string'
            },
            {
                apiName: 'State',
                label: 'State',
                type: 'string'
            },
            {
                apiName: 'Zip',
                label: 'Zip',
                type: 'string'
            }
        ];
        orgUtilsStub.returns(Promise.resolve(sobjectFields));
        showQuickPickStub.onCall(1).returns({ label: 'City', detail: 'City' });
        showQuickPickStub
            .onCall(2)
            .returns({ label: 'State', detail: 'State' });
        showQuickPickStub.onCall(3).returns({ label: 'Zip', detail: 'Zip' });

        let uem = new UEMBuilder();
        const fakeAddRecordListCard = sinon.fake();
        uem.addRecordListCard = fakeAddRecordListCard;
        uem = await LandingPageCommand.configureRecordListCard(uem);

        const apiNameArg = fakeAddRecordListCard.args[0][0];
        const labelPluralArg = fakeAddRecordListCard.args[0][1];
        const selectedFieldsArg = fakeAddRecordListCard.args[0][2];
        assert.equal(apiNameArg, sobject.apiName);
        assert.equal(labelPluralArg, sobject.labelPlural);
        assert.deepStrictEqual(selectedFieldsArg.sort(), sobjectFields.sort());
    });
});
