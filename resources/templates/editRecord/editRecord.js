import { LightningElement, api, wire } from "lwc";
import { getRecord } from "lightning/uiRecordApi";

///TEMPLATE_IMPORTS///

export default class Edit///TEMPLATE_OBJECT_API_NAME///Record 
extends LightningElement {
  @api recordId;
  @api objectApiName;

  ///TEMPLATE_VARIABLES///

  @wire(getRecord, { recordId: "$recordId", fields: [NAME_FIELD] })
  record;

  get name() {
    return this.record?.data?.fields?.Name?.value || "";
  }

  onSuccess(event) {
    console.log("Updated record", event.detail);
    // Dismiss modal on success
    this.dismiss(event);
  }

  dismiss(event) {
    console.log("Dismissing modal", event.detail);
    // TODO: Can we use window.history.back() here?
    // eslint-disable-next-line no-restricted-globals
    history.back();
  }
}
