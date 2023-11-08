import { LightningElement, api, wire } from "lwc";
import { getRecord } from "lightning/uiRecordApi";

///TEMPLATE_IMPORTS///

export default class View///TEMPLATE_OBJECT_API_NAME///Record 
extends LightningElement {
  @api recordId;
  @api objectApiName;

  get fields() {
    return [
      ///TEMPLATE_FIELDS///
    ];
  }

  @wire(getRecord, { recordId: "$recordId", fields: "$fields" })
  record;

  get name() {
    return this.record?.data?.fields?.Name?.value ?? "";
  }
}
