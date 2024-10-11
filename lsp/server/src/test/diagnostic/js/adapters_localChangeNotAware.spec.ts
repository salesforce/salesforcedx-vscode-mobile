/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as assert from 'assert';
import * as sinon from 'sinon';

import { AdaptersLocalChangeNotAware } from '../../../diagnostic/js/adapters_localChangeNotAware';
import { parseJs } from '../../../utils/babelUtil';
import { TextDocument } from 'vscode-languageserver-textdocument';

const relatedRecordsJS = `
import { LightningElement, wire } from "lwc";
import { getRelatedListRecords } from "lightning/uiRelatedListApi";

export default class RelatedListRecords extends LightningElement {

  recordId = "0015g00000XYZABC";

  relatedRecords;

  @wire(getRelatedListRecords, {
    parentRecordId: "$recordId", 
    relatedListId: "Opportunities",
    fields: ["Opportunity.Name"],
  })
  relatedListHandler({ error, data }) {
  }
}
`;

describe('AdaptersLocalChangeNotAware', () => {
    const rule = new AdaptersLocalChangeNotAware();

    beforeEach(function () {
        sinon.restore();
    });

    it('produce diagnostic for getRelatedRecords', async () => {
        const textDocument = TextDocument.create(
            'file://test.js',
            'javascript',
            1,
            relatedRecordsJS
        );
        const jsAstNode = parseJs(textDocument.getText());
        const diagnostics = await rule.validateDocument(
            textDocument,
            jsAstNode
        );

        assert.equal(diagnostics.length, 1);
        const { range } = diagnostics[0];

        const startOffset = textDocument.offsetAt(range.start);
        const endOffset = textDocument.offsetAt(range.end);

        const targetString = relatedRecordsJS.substring(startOffset, endOffset);

        assert.equal(targetString, 'getRelatedListRecords');
    });
});
