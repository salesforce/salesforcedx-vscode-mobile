/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

const vscode = acquireVsCodeApi();

// Set up button event handlers and message passing.
const buttons = document.getElementsByTagName("button");
if (!buttons || buttons.length === 0) {
  console.error("No buttons found! No event handlers will be created.");
} else {
  for (const button of buttons) {
    const buttonId = button.getAttribute("id");
    if (!buttonId) {
      console.error(
        "Button has no id value! No event handler will be created."
      );
    } else {
      button.addEventListener("click", () => {
        vscode.postMessage({ button: buttonId });
      });
    }
  }
}
