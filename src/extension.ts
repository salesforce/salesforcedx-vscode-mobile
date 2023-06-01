// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { OnboardingCommands } from "./onboardingCommands";

const wizardCommand = "salesforcedx-vscode-offline-app.onboardingWizard";
const onboardingWizardStateKey =
  "salesforcedx-vscode-offline-app.onboardingWizard.projectCreationState";

enum OnboardingWizardState {
  projectCreated,
}

export function activate(context: vscode.ExtensionContext) {
  // If activation is coming as the result of the project being created and newly
  // loaded into the workspace, pick up with the next step of the wizard.
  const isPostProjectCreation =
    context.globalState.get(onboardingWizardStateKey) ===
    OnboardingWizardState.projectCreated;
  if (isPostProjectCreation) {
    context.globalState.update(onboardingWizardStateKey, undefined);
    vscode.commands.executeCommand(wizardCommand, true);
  }
  let disposable = vscode.commands.registerCommand(
    wizardCommand,
    async (fromPostProjectCreation: boolean = false) => {
      if (fromPostProjectCreation) {
        await OnboardingCommands.deployToOrg();
        await OnboardingCommands.setupBriefcase(context.extensionUri);
      } else {
        const projectDir = await OnboardingCommands.configureProject(true);
        if (projectDir === "") {
          // No directory selected.
          return Promise.resolve();
        }
        context.globalState.update(
          onboardingWizardStateKey,
          OnboardingWizardState.projectCreated
        );
      }
    }
  );

  disposable = vscode.commands.registerCommand(
    "com.salesforce.sandbox.starterkit.configureProject",
    () => {
      OnboardingCommands.configureProject();
    }
  );
  context.subscriptions.push(disposable);

  disposable = vscode.commands.registerCommand(
    "com.salesforce.sandbox.starterkit.deployProject",
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage("Hello VSCode!");
    }
  );
  context.subscriptions.push(disposable);

  disposable = vscode.commands.registerCommand(
    "com.salesforce.sandbox.starterkit.landingPage",
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage("Hello VSCode!");
    }
  );
  context.subscriptions.push(disposable);

  disposable = vscode.commands.registerCommand(
    "com.salesforce.sandbox.starterkit.sObjectSetup",
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage("Hello VSCode!");
    }
  );
  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
