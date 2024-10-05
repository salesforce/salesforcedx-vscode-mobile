import * as assert from 'assert';
import * as sinon from 'sinon';
import { suite, afterEach, test } from 'mocha';
import { findNonEditableAdapter } from '../diagnostic/adapters_localChangeNotAware';
import * as parser from '@babel/parser';

const relatedRecordsJS = `
import { LightningElement, wire } from "lwc";
import { getRelatedListRecords } from "lightning/uiRelatedListApi";

export default class RelatedListRecords extends LightningElement {
  // Specify the parent record ID, the related list you want, and the fields
  recordId = "0015g00000XYZABC"; // Replace with the actual record ID (Account in this example)

  relatedRecords;

  @wire(getRelatedListRecords, {
    parentRecordId: "$recordId", // Parent record (e.g., Account Id)
    relatedListId: "Opportunities", // API name of the related list (Opportunities related to Account)
    fields: ["Opportunity.Name", "Opportunity.Amount", "Opportunity.StageName"], // Fields to fetch
  })
  relatedListHandler({ error, data }) {
    if (data) {
      this.relatedRecords = data.records;
      console.log("Related records fetched successfully:", this.relatedRecords);
    } else if (error) {
      console.error("Error fetching related records:", error);
    }
  }
}
`;

suite('JS parsing', () => {
    afterEach(function () {
        sinon.restore();
    });

    test('identify getRelatedRecords', () => {
        const jsNode = parser.parse(relatedRecordsJS, {
            sourceType: 'module',
            plugins: ['decorators']
        });
        const nodes = findNonEditableAdapter(jsNode, 'getRelatedListRecords');
        assert.equal(nodes.length, 1);
    });
});
