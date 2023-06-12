/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import * as sinon from 'sinon';
import { Uri, env, languages } from 'vscode';
import { InstructionsWebviewProvider } from '../../webviews';
import { afterEach, beforeEach } from 'mocha';
import * as fs from 'fs';

suite('InstructionsWebviewProvider Test Suite', () => {
    const extensionUri = Uri.parse("file:///tmp/testdir");

    beforeEach(function () {});

    afterEach(function () {
        sinon.restore();
    });

    test('Locale-specific file is returned if it exists', async () => {
        const languageStub = sinon.stub(env, "language");
        languageStub.value("es");

        const fsExistStub = sinon.stub(fs, "existsSync");
        fsExistStub.returns(true);

        const provider = new InstructionsWebviewProvider(extensionUri);
        const path = provider.getLocaleContentPath(extensionUri, "test.html");

        assert.equal(path, "test.es.html");
    });

    test('Defaults to english file if locale-specific file does not exist.', async () => {
        const languageStub = sinon.stub(env, "language");
        languageStub.value("es");

        const fsExistStub = sinon.stub(fs, "existsSync");
        fsExistStub.returns(false);

        const provider = new InstructionsWebviewProvider(extensionUri);
        const path = provider.getLocaleContentPath(extensionUri, "test.html");

        assert.equal(path, "test.html");
    });

});
