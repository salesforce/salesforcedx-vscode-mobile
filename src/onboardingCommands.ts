/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */

import * as vscode from "vscode";
import * as path from "path";
import { CommonUtils } from "@salesforce/lwc-dev-mobile-core/lib/common/CommonUtils";
import { showInstructionWebView } from "./extension";

export class OnboardingCommands {
  public static async configureProject(
    fromWizard: boolean = false
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const header: vscode.QuickPickOptions = {
        placeHolder: "Create a new project, or open an existing project",
      };
      const items: vscode.QuickPickItem[] = [
        {
          label: "Create New Project...",
          description:
            "Creates a new local project configured with the Offline Starter Kit",
        },
        {
          label: "Open Existing Project...",
          description:
            "Opens an existing local project configured with the Offline Starter Kit",
        },
      ];
      const selected = await vscode.window.showQuickPick(items, header);
      if (!selected) {
        return resolve("");
      }

      if (selected.label === "Create New Project...") {
        const folderUri = await vscode.window.showOpenDialog({
          openLabel: "Select project folder",
          canSelectFolders: true,
          canSelectFiles: false,
          canSelectMany: false,
        });
        if (!folderUri || folderUri.length === 0) {
          return resolve("");
        }

        let infoMessage = "Follow the prompts to configure the project.";
        if (fromWizard) {
          infoMessage +=
            " NOTE: after the project is loaded, please be patient while the wizard resumes.";
        }
        await vscode.window.showInformationMessage(infoMessage, {
          title: "OK",
        });
        const githubRepoUri: string =
          "https://github.com/salesforce/offline-app-developer-starter-kit.git";
        try {
          await vscode.commands.executeCommand(
            "git.clone",
            githubRepoUri,
            folderUri[0].fsPath
          );
          return resolve(folderUri[0].fsPath);
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to clone: ${error}`);
          return reject(error);
        }
      } else if (selected.label === "Open Existing Project...") {
        console.log("Open existing project");
        return resolve("");
      } else {
        return resolve("");
      }
    });
  }

  public static async deployToOrg(): Promise<void> {
    // TODO: Check to see if the Salesforce Extension Pack is installed.
    // The commented code below starts the process.
    // const extension = vscode.extensions.getExtension(
    //   "salesforce.salesforcedx-vscode"
    // );
    // console.log(`Extension: ${extension}`);

    const currentWorkspace = vscode.workspace;
    if (!currentWorkspace.workspaceFolders) {
      await vscode.window.showErrorMessage(
        "There are no workspace folders defined in your project.",
        { title: "OK" }
      );
      return Promise.resolve();
    }

    const result = await vscode.window.showInformationMessage(
      "Do you want to authorize an Org, or deploy to an already-authorized Org?",
      { title: "Authorize" },
      { title: "Deploy" }
    );

    if (result) {
      if (result.title === "Authorize") {
        await vscode.commands.executeCommand("sfdx.force.auth.web.login");
        await vscode.window.showInformationMessage(
          "Once you've authorized your Org, click here to continue.",
          { title: "OK" }
        );
      }
      const workspaceFolderPath =
        currentWorkspace.workspaceFolders[0].uri.fsPath;
      const forceAppPath = path.join(workspaceFolderPath, "force-app");
      const forceAppUri = vscode.Uri.file(forceAppPath);
      await vscode.commands.executeCommand(
        "sfdx.force.source.deploy.source.path",
        forceAppUri
      );
      return Promise.resolve();
    } else {
      return Promise.resolve();
    }
  }

  public static async setupBriefcase(extensionUri: vscode.Uri): Promise<void> {
    await vscode.window.showInformationMessage(
      "Click OK to launch your org to the Briefcase Builder page. After " +
        "launching, return here for instructions to set up a Briefcase rule.",
      { title: "OK" }
    );

    // TODO: this `withProgress` call probably needs tweaking on UX.
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Launching Briefcase Builder...",
      },
      async (progress, token) => {
        await CommonUtils.executeCommandAsync(
          "sfdx org open -p '/lightning/setup/Briefcase/home'"
        );
      }
    );

    showInstructionWebView(extensionUri, "Briefcase Setup Instruction", "src/instructions/briefcase.html");
  }
}
