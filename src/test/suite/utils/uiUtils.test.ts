/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import { UIUtils } from '../../../utils/uiUtils';
import { QuickPickItem, window, QuickPick } from 'vscode';
import { afterEach, beforeEach } from 'mocha';
import * as sinon from 'sinon';

suite('UIUtils Test Suite', () => {
    beforeEach(function () {});

    afterEach(function () {
        sinon.restore();
    });

    test('Shows a picker and selects an item', async () => {
        // set up spies for the QuickPick.
        const showQuickPickSpy = sinon.spy(window, 'createQuickPick');

        const quickPickItem: QuickPickItem = {
            label: 'label1',
            detail: 'apiName1'
        };

        // show the quick pick, but don't wait because we need to get the onDidChangeSelection
        // callback and invoke it to get the promise to resolve()
        const selectedItemPromise = UIUtils.showQuickPick(
            'placeholder',
            'progress',
            async () => {
                return new Promise<QuickPickItem[]>(async (resolve, reject) => {
                    resolve([quickPickItem]);
                });
            },
            true
        );

        const quickPick = showQuickPickSpy.returnValues[0]; // the actual quick pick that was returned
        let quickPickSpy = sinon.spy(quickPick); // track interactions once something is selected

        // add a 1ms delay to select an item (so the quick pick finishes initializing because we didn't await above)
        setTimeout(() => {
            quickPick.selectedItems = [quickPickItem];
        }, 1);
        const selectedItem = await selectedItemPromise;
        assert.equal(selectedItem, quickPickItem);

        // verify the quickpick show() and dispose() was invoked
        assert.equal(quickPickSpy.show.callCount > 0, true); // ensure it was shown

        // ensure ignore focus out was set to what we passed in
        assert.equal(quickPickSpy.ignoreFocusOut, true);
    });

    test('When quick pick is dismissed without selecting a value, ensure it is rejected', async () => {
        // set up spies for the QuickPick.
        const showQuickPickSpy = sinon.spy(window, 'createQuickPick');

        const quickPickItem: QuickPickItem = {
            label: 'label1',
            detail: 'apiName1'
        };

        // show the quick pick, but don't wait because we need to get the onDidChangeSelection
        // callback and invoke it to get the promise to resolve()
        const selectedItemPromise = UIUtils.showQuickPick(
            'placeholder',
            'progress',
            async () => {
                return new Promise<QuickPickItem[]>(async (resolve, reject) => {
                    resolve([quickPickItem]);
                });
            }
        );

        const quickPick = showQuickPickSpy.returnValues[0]; // the actual quick pick that was returned
        let quickPickSpy = sinon.spy(quickPick); // track interactions once something is selected

        // add a 1ms delay to select an item (so the quick pick finishes initializing because we didn't await above)
        setTimeout(() => {
            quickPick.hide();
        }, 1);

        let exceptionCount = 0;
        await selectedItemPromise.catch((err) => {
            exceptionCount++;
        });

        assert.equal(exceptionCount, 1);
        assert.equal(quickPickSpy.dispose.called, true); // ensure it was disposed of after item selected
    });
});
