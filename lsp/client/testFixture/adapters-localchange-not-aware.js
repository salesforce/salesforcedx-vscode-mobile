/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import { LightningElement, wire } from 'lwc';
import { getRelatedListRecords } from 'lightning/uiRelatedListApi';

export default class RelatedListRecords extends LightningElement {
    recordId = '0015g00000XYZABC';

    relatedRecords;

    @wire(getRelatedListRecords, {
        parentRecordId: '$recordId',
        relatedListId: 'Opportunities',
        fields: ['Opportunity.Name']
    })
    relatedListHandler({ error, data }) {}
}
