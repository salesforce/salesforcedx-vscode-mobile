import { Messages } from '@salesforce/core';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
export const messages = Messages.loadMessages(
    'salesforcedx-vscode-offline-app', // must match the `name` value in package.json
    'messages'
);