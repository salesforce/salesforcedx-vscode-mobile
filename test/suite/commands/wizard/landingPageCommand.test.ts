/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { OrgUtils, SObject } from '../../../../src/utils/orgUtils';
import { SinonStub } from 'sinon';
import { afterEach, beforeEach } from 'mocha';
import { UIUtils } from '../../../../src/utils/uiUtils';
import { UEMBuilder } from '../../../../src/utils/uemBuilder';
import { QuickPickItem } from 'vscode';
import { LandingPageCommand } from '../../../../src/commands/wizard/landingPageCommand';

suite('Landing Page Command Test Suite', () => {
    let originalShowQuickPickFunction: (
        placeholderMessage: string,
        progressMessage: string,
        optionsCallback: () => Promise<QuickPickItem[]>
    ) => Promise<QuickPickItem>;

    beforeEach(function () {
        // we are stubbing the UIUtils.showQuickPick() function for testing, so we need to set it back after each test case.
        originalShowQuickPickFunction = UIUtils.showQuickPick;
    });

    afterEach(function () {
        UIUtils.showQuickPick = originalShowQuickPickFunction;
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
        const sobject: SObject = {
            apiName: 'SomeApiName',
            label: 'SomeObject',
            labelPlural: 'SomeObjects'
        };

        // Set up a stubbed function that invokes the passed in callback and returns stubbed values for testing.
        // This ensures the callback() is invoked giving more code coverage during testing. This is effectively
        // mocking out UIUtils functions.
        let callCount = 0;
        const mockUIUtilsShowQuickPick = async function (
            placeholderMessage: string,
            progressMessage: string,
            callback: () => Promise<QuickPickItem[]>
        ): Promise<QuickPickItem> {
            // we need to execute the callback and wait
            await callback();

            // now simulate what the user picked as part of the Promise.
            switch (callCount++) {
                case 0:
                    return Promise.resolve({
                        label: sobject.labelPlural,
                        detail: sobject.apiName
                    });
                case 1:
                    return Promise.resolve({ label: 'City', detail: 'City' });
                case 2:
                    return Promise.resolve({ label: 'State', detail: 'State' });
                case 3:
                    return Promise.resolve({ label: 'Zip', detail: 'Zip' });
            }

            assert.fail('Should never reach here.');
        };
        UIUtils.showQuickPick = mockUIUtilsShowQuickPick;

        // Set up the sObject and 3 field pickers
        const orgUtilsStubSobjects = sinon.stub(OrgUtils, 'getSobjects');
        const sobjects = [sobject];
        orgUtilsStubSobjects.returns(Promise.resolve(sobjects));

        const orgUtilsStubFields = sinon.stub(OrgUtils, 'getFieldsForSObject');
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
        orgUtilsStubFields.returns(Promise.resolve(sobjectFields));

        let uem = new UEMBuilder();
        const fakeAddRecordListCard = sinon.fake();
        uem.addRecordListCard = fakeAddRecordListCard;
        uem = await LandingPageCommand.configureRecordListCard(uem);

        // check that we passed in the expected params to UEMBuilder.addRecordListCard()
        const apiNameArg = fakeAddRecordListCard.args[0][0]; // apiName
        const labelPluralArg = fakeAddRecordListCard.args[0][1]; // plural label
        const selectedFieldsArg = fakeAddRecordListCard.args[0][2]; // list of selected fields
        assert.equal(apiNameArg, sobject.apiName);
        assert.equal(labelPluralArg, sobject.labelPlural);
        assert.deepStrictEqual(selectedFieldsArg.sort(), sobjectFields.sort());
    });
});
