/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import { UIUtils } from '../../../utils/uiUtils';
import { QuickPickItem, window } from 'vscode';
import { SinonStub } from 'sinon';
import sinon = require('sinon');

suite('UIUtils Test Suite', () => {
    test('Shows a picker', (done) => {
        const showQuickPickStub: SinonStub = sinon.stub(
            window,
            'createQuickPick'
        );
        const fakeOnDidChangeSelection = sinon.fake();
        const fakeShow = sinon.fake();
        const fakeDispose = sinon.fake();

        showQuickPickStub.returns({
            onDidChangeSelection: fakeOnDidChangeSelection,
            show: fakeShow,
            dispose: fakeDispose
        });

        const quickPickItem = {
            label: 'label1',
            detail: 'apiName1'
        };

        // show the quick pick, but don't wait because we need to get the onDidChangeSelection
        // callback and invoke it to get the promise to resolve()
        const selectedItem = UIUtils.showQuickPick(
            'placeholder',
            'progress',
            () => {
                return new Promise<QuickPickItem[]>((resolve, reject) => {
                    resolve([quickPickItem]);
                });
            }
        ).then(() => {
            assert.equal(fakeOnDidChangeSelection.callCount, 1);
            assert.equal(
                fakeShow.callCount,
                2,
                'number of times show() is invoked'
            );
            assert.equal(fakeDispose.callCount, 1);

            done();
        });

        const changeSelectionArg = fakeOnDidChangeSelection.args[0][0];
        changeSelectionArg([quickPickItem]);
    });
});
