# Releasing the Mobile Extension

## Validating the release package locally, before publishing

Before publishing the extension, you'll want to test the "built" extension package locally, as the bundling and packaging workflow creates an extension whose code is structured quite differently from what you work with in a local development environment, and as such unforeseen issues could show up that otherwise wouldn't with local development.

The following instructions will create the extension package (`salesforcedx-vscode-mobile-<version>.vsix`) locally:

1.  Install the repository package

        npm install

2.  Create the VSIX package

        npx vsce package

    **NOTE:** The packaging workflow prunes the dev dependencies out of the `node_modules/` tree, so you'll need to re-run `npm install` to reinstall dev dependencies and continue development work.

3.  Install the generated .vsix file and test as you will:

        code --install-extension salesforcedx-vscode-mobile-<version>.vsix

## Publishing the extension package

Publishing of the package will be handled as GitHub Action initiated by a user responsible for publishing the package, once all testing and sign-off has occurred on the generated package.
