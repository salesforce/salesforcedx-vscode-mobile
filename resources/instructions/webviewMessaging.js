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
        sendMessageRequest: function (type, data, callback) {
            let message;
            if (callback) {
                const asyncMessageRequestId = requestId++;
                asyncMessageCallbacks[asyncMessageRequestId] = callback;

                message = { type, callbackId: asyncMessageRequestId, ...data };
            } else {
                message = { type, ...data };
            }
            vscode.postMessage(message);
        }
    };
})();
