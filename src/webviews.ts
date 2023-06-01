import * as vscode from "vscode";
import * as fs from "fs";

export const MESSAGING_SCRIPT_PATH_DEMARCATOR = "--- MESSAGING_SCRIPT_SRC ---";
export const MESSAGING_JS_PATH = "src/instructions/webviewMessaging.js";
const INSTRUCTION_VIEW_TYPE = "instructionsView";

export type ButtonAction = {
  buttonId: string;
  action: (panel: vscode.WebviewPanel) => void;
};

export class InstructionsWebviewProvider {
  extensionUri: vscode.Uri;

  constructor(extensionUri: vscode.Uri) {
    this.extensionUri = extensionUri;
  }

  public showInstructionWebview(
    title: string,
    contentPath: string,
    buttonActions: ButtonAction[]
  ) {
    const panel = vscode.window.createWebviewPanel(
      INSTRUCTION_VIEW_TYPE,
      title,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: [this.extensionUri],
      }
    );

    panel.webview.onDidReceiveMessage((data) => {
      const clickedButtonId = data.button;
      const buttonAction = buttonActions.find((action) => {
        return action.buttonId === clickedButtonId;
      });
      if (buttonAction) {
        buttonAction.action(panel);
      }
    });

    const htmlPath = vscode.Uri.joinPath(this.extensionUri, contentPath);
    const messagingJsPath = vscode.Uri.joinPath(
      this.extensionUri,
      MESSAGING_JS_PATH
    );

    let webviewContent = fs.readFileSync(htmlPath.fsPath, {
      encoding: "utf-8",
    });
    webviewContent = webviewContent.replace(
      MESSAGING_SCRIPT_PATH_DEMARCATOR,
      panel.webview.asWebviewUri(messagingJsPath).toString()
    );
    panel.webview.html = webviewContent;
  }
}
