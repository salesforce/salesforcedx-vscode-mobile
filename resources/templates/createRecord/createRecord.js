import { LightningElement, api } from "lwc";

///TEMPLATE_IMPORTS///

export default class Create///TEMPLATE_OBJECT_API_NAME///Record
extends LightningElement {
  @api recordId;
  @api objectApiName;

  ///TEMPLATE_VARIABLES///

  ///TEMPLATE_VARIABLE_ASSIGNMENTS///

  onSuccess(event) {
    console.log("Created record", event.detail);
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
