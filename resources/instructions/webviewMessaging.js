/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

// ------------------
// Callback Messaging
// ------------------
//
// Async, callback-based messaging mechanism for clients
//
const webviewMessaging = (function () {
    const vscode = acquireVsCodeApi();
    let requestId = 0;
    const asyncMessageCallbacks = {};

    // Receives messages from the backing TypeScript controller page that
    // created the hosted webview. These messages will be linked back to
    // originating requests, passing any response data back to the async
    // caller.
    window.addEventListener('message', (event) => {
        const message = event.data;
        if (message.callbackId && asyncMessageCallbacks[message.callbackId]) {
            const callback = asyncMessageCallbacks[message.callbackId];
            delete asyncMessageCallbacks[message.callbackId];
            delete message.callbackId;
            callback(message);
        }
    });

    return {
        /**
         * Sends a message request to the backing TypeScript controller page that
         * created the hosted webview.
         * @param {string} type - A name representing the type of request. Basically
         * the event key to which the controller page will subscribe.
         * @param {object} [data] - An optional block of input data to pass to the
         * controller.
         * @param {Function} [callback] - An optional callback for receiving a
         * response from the controller, if expected.
         */
        sendMessageRequest: function (type, data, callback) {
            let message;
            if (callback) {
                const asyncMessageRequestId = ++requestId;
                asyncMessageCallbacks[asyncMessageRequestId] = callback;

                message = { type, callbackId: asyncMessageRequestId, ...data };
            } else {
                message = { type, ...data };
            }
            vscode.postMessage(message);
        }
    };
})();
