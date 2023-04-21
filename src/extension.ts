// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('com.khawkins.sandbox.starterkit.wizard', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello VSCode!');
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('com.khawkins.sandbox.starterkit.configureProject', async () => {
		const header: vscode.QuickPickOptions = {
			placeHolder: "Create a new project, or open an existing project"
		};
		let items: vscode.QuickPickItem[] = [
			{
				label: "Create New Project...",
				description: "Creates a new local project configured with the Offline Starter Kit",
			},
			{
				label: "Open Existing Project...",
				description: "Opens an existing local project configured with the Offline Starter Kit",
			},
		];
		const selected = await vscode.window.showQuickPick(items, header);
		if (!selected) {
			return;
		}

		if (selected.label === "Create New Project..." ) {
			const folderUri = await vscode.window.showOpenDialog({
				openLabel: "Select project folder",
				canSelectFolders: true,
				canSelectFiles: false,
				canSelectMany: false
			});
			if (!folderUri || folderUri.length === 0) {
				return;
			}
			const githubRepoUri: string = "https://github.com/salesforce/offline-app-developer-starter-kit.git";
			try {
				await vscode.commands.executeCommand("git.clone", githubRepoUri, folderUri[0].fsPath);
				vscode.window.showInformationMessage(`Cloned ${githubRepoUri} to ${folderUri[0].fsPath}`);
			} catch (error) {
				vscode.window.showErrorMessage(`Failed to clone: ${error}`);
			}
		} else if (selected.label === "Open Existing Project...") {
			console.log("Open existing project");
		}

	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('com.khawkins.sandbox.starterkit.deployProject', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello VSCode!');
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('com.khawkins.sandbox.starterkit.landingPage', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello VSCode!');
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('com.khawkins.sandbox.starterkit.sObjectSetup', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello VSCode!');
	});
	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
