Instructions to package this as an extension (*.vsix) file:

1. Install vsce

```
npm install -g @vscode/vsce
```

2. Install dependencies

NOTE: The packaging steps prunes the node_modules tree, so running `npm install` will reinstall dev dependencies.

```
npm install
```

3. Create package

```
vsce package
```

4. Manually install the generated .vsix file and smoke test.

TODO: Eventually we can sign and publish it directly to marketplace.