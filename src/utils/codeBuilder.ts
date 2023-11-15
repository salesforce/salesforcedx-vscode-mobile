/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: MIT
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/MIT
 */
import * as fs from 'fs';
import { Uri } from 'vscode';
import * as path from 'path';
import { CompactLayoutField } from './orgUtils';
import { WorkspaceUtils } from './workspaceUtils';

type TemplateVariables = { [name: string]: string };

export class CodeBuilder {
    static readonly QUICK_ACTION_TEMPLATE_NAME = 'quickAction.xml';

    static readonly TEMPLATE_FILE_EXTENSIONS = [
        'css',
        'html',
        'js',
        'js-meta.xml'
    ];

    // template variables
    static readonly TEMPLATE_CREATE_LWC_LABEL = 'TEMPLATE_CREATE_LWC_LABEL';
    static readonly TEMPLATE_EDIT_LWC_LABEL = 'TEMPLATE_EDIT_LWC_LABEL';
    static readonly TEMPLATE_FIELDS = 'TEMPLATE_FIELDS';
    static readonly TEMPLATE_IMPORTS = 'TEMPLATE_IMPORTS';
    static readonly TEMPLATE_LIGHTNING_INPUT_CREATE_FIELDS_HTML =
        'TEMPLATE_LIGHTNING_INPUT_CREATE_FIELDS_HTML';
    static readonly TEMPLATE_LIGHTNING_INPUT_EDIT_FIELDS_HTML =
        'TEMPLATE_LIGHTNING_INPUT_EDIT_FIELDS_HTML';
    static readonly TEMPLATE_OBJECT_API_NAME = 'TEMPLATE_OBJECT_API_NAME';
    static readonly TEMPLATE_VARIABLES = 'TEMPLATE_VARIABLES';
    static readonly TEMPLATE_VARIABLE_ASSIGNMENTS =
        'TEMPLATE_VARIABLE_ASSIGNMENTS';
    static readonly TEMPLATE_VIEW_LWC_LABEL = 'TEMPLATE_VIEW_LWC_LABEL';
    static readonly TEMPLATE_LWC_NAME = 'TEMPLATE_LWC_NAME';
    static readonly TEMPLATE_QUICK_ACTION_ICON = 'TEMPLATE_QUICK_ACTION_ICON';
    static readonly TEMPLATE_QUICK_ACTION_LABEL = 'TEMPLATE_QUICK_ACTION_LABEL';

    private extensionUri: Uri;
    private objectApiName: string;
    templateVariables: TemplateVariables;
    fieldNames: string[];

    constructor(
        extensionUri: Uri,
        objectApiName: string,
        compactLayoutFields: CompactLayoutField[]
    ) {
        this.extensionUri = extensionUri;
        this.objectApiName = objectApiName;

        this.fieldNames = this.getFieldNames(compactLayoutFields);
        this.templateVariables = this.generateTemplateVariables(
            this.fieldNames
        );
    }

    async generateView(): Promise<boolean> {
        return new Promise(async (resolve) => {
            const lwcName = `view${this.objectApiName}Record`;
            this.copyTemplateFiles(
                this.templateVariables,
                'viewRecord',
                lwcName
            );
            this.createQuickAction(this.templateVariables, 'View', lwcName);
            resolve(true);
        });
    }

    async generateEdit(): Promise<boolean> {
        return new Promise(async (resolve) => {
            const lwcName = `edit${this.objectApiName}Record`;
            this.copyTemplateFiles(
                this.templateVariables,
                'editRecord',
                lwcName
            );
            this.createQuickAction(
                this.templateVariables,
                'Edit',
                lwcName,
                'editActionIcon'
            );
            resolve(true);
        });
    }

    async generateCreate(): Promise<boolean> {
        return new Promise(async (resolve) => {
            const lwcName = `create${this.objectApiName}Record`;
            this.copyTemplateFiles(
                this.templateVariables,
                'createRecord',
                lwcName
            );
            this.createQuickAction(this.templateVariables, 'Create', lwcName);
            resolve(true);
        });
    }

    private getFieldNames(compactLayoutFields: CompactLayoutField[]) {
        const fieldNames: string[] = [];
        compactLayoutFields.forEach((field) => {
            field.layoutComponents.forEach((component) => {
                fieldNames.push(component.value);
            });
        });
        return fieldNames;
    }

    private createQuickAction(
        templateVariables: TemplateVariables,
        label: string,
        name: string,
        iconName: string | undefined = undefined
    ) {
        const templateFilePath = path.join(
            WorkspaceUtils.LWC_TEMPLATE_PATH,
            CodeBuilder.QUICK_ACTION_TEMPLATE_NAME
        );
        const fileContents = this.readFileContents(templateFilePath);

        const quickActionVariables: TemplateVariables = {};
        quickActionVariables[CodeBuilder.TEMPLATE_QUICK_ACTION_LABEL] = label;
        quickActionVariables[CodeBuilder.TEMPLATE_LWC_NAME] = name;
        if (iconName !== undefined && iconName !== '') {
            quickActionVariables[
                CodeBuilder.TEMPLATE_QUICK_ACTION_ICON
            ] = `<icon>${iconName}</icon>`;
        } else {
            quickActionVariables[CodeBuilder.TEMPLATE_QUICK_ACTION_ICON] = '';
        }

        // do substitutions
        const newFileContents = this.replaceAllTemplateVariables(fileContents, {
            ...templateVariables,
            ...quickActionVariables
        });

        // copy to destination directory
        const objectApiName =
            templateVariables[CodeBuilder.TEMPLATE_OBJECT_API_NAME];
        // file name convention example: Account.view.quickAction-meta.xml
        const destinationFile = `${objectApiName}.${label.toLocaleLowerCase()}.quickAction-meta.xml`;

        this.writeFileContents(
            WorkspaceUtils.QUICK_ACTIONS_PATH,
            destinationFile,
            newFileContents
        );
    }

    private copyTemplateFiles(
        templateVariables: TemplateVariables,
        template: string,
        destinationLwc: string
    ) {
        CodeBuilder.TEMPLATE_FILE_EXTENSIONS.forEach((extension) => {
            const templateFilePath = path.join(
                WorkspaceUtils.LWC_TEMPLATE_PATH,
                template,
                `${template}.${extension}`
            );
            const fileContents = this.readFileContents(templateFilePath);

            // do substitutions
            const newFileContents = this.replaceAllTemplateVariables(
                fileContents,
                templateVariables
            );

            // copy to destination directory
            const destinationDir = path.join(
                WorkspaceUtils.LWC_PATH,
                destinationLwc
            );
            const destinationFile = `${destinationLwc}.${extension}`;

            this.writeFileContents(
                destinationDir,
                destinationFile,
                newFileContents
            );
        });
    }

    private replaceAllTemplateVariables(
        contents: string,
        templateVariables: TemplateVariables
    ) {
        var newFileContents = contents;
        for (const key in templateVariables) {
            if (templateVariables.hasOwnProperty(key)) {
                const value = templateVariables[key];
                newFileContents = newFileContents.replace(
                    `///${key}///`,
                    value
                );
            }
        }
        return newFileContents;
    }

    private readFileContents(filePath: string): string {
        const extensionFilePath = Uri.joinPath(this.extensionUri, filePath);
        try {
            return fs.readFileSync(extensionFilePath.fsPath, 'utf8');
        } catch (err) {
            console.log(`Could not read file ${filePath}`, err);
            return '';
        }
    }

    private writeFileContents(
        dirPath: string,
        filename: string,
        content: string
    ) {
        // ensure dirPath exists
        if (!fs.existsSync(dirPath)) {
            try {
                fs.mkdirSync(dirPath, { recursive: true });
            } catch (err) {
                console.log(`Unable to create directory: ${dirPath}`, err);
                return;
            }
        }
        // write the file
        const filePath = path.join(dirPath, filename);
        try {
            fs.writeFileSync(filePath, content, 'utf8');
        } catch (err) {
            console.error(`Error writing to file ${filePath}`, err);
        }
    }

    /**
     * Ensure all the TEMPLATE_* variables have a value.
     */
    private generateTemplateVariables(fieldNames: string[]): TemplateVariables {
        const templateVariables: TemplateVariables = {};
        templateVariables[CodeBuilder.TEMPLATE_OBJECT_API_NAME] =
            this.objectApiName;

        // Labels
        templateVariables[
            CodeBuilder.TEMPLATE_CREATE_LWC_LABEL
        ] = `LWC for creating a/an ${this.objectApiName} instance.`;
        templateVariables[
            CodeBuilder.TEMPLATE_EDIT_LWC_LABEL
        ] = `LWC for editing a/an ${this.objectApiName} instance.`;
        templateVariables[
            CodeBuilder.TEMPLATE_VIEW_LWC_LABEL
        ] = `LWC for viewing a/an ${this.objectApiName} instance.`;

        // We need to populate the following template variables:
        // TEMPLATE_FIELDS - a comma separated list of field names from the import statements, used in viewRecord template.
        //    ie: return [NAME_FIELD, PHONE_FIELD, WEBSITE_FIELD, INDUSTRY_FIELD, TYPE_FIELD];
        // TEMPLATE_IMPORTS - a list of import statements that pulls in the @salesforce/schema fields:
        //    ie: import NAME_FIELD from "@salesforce/schema/Account.Name";
        // TEMPLATE_LIGHTNING_INPUT_CREATE_FIELDS_HTML - fields specified as lightning-input-field values in the create html:
        //    ie: <lightning-input-field field-name={nameField} value={name}></lightning-input-field>
        // TEMPLATE_LIGHTNING_INPUT_EDIT_FIELDS_HTML - fields specified as lightning-input-field values in the edit html
        //    ie: <lightning-input-field field-name={nameField}></lightning-input-field>
        // TEMPLATE_VARIABLES - aliases the imported fields to variables
        //    ie: nameField = NAME_FIELD;
        // TEMPLATE_VARIABLE_ASSIGNMENTS - stores the value of the create fields:
        //    ie: name = "";

        var fields = '';
        var imports = '';
        var createFieldsHtml = '';
        var editFieldsHtml = '';
        var importAliases = '';
        var variableAssignments = '';

        fieldNames.forEach((field) => {
            var fieldNameImport = `${field.toUpperCase()}_FIELD`;
            fields += `${fieldNameImport}, `;
            imports += `import ${fieldNameImport} from "@salesforce/schema/${this.objectApiName}.${field}";\n`;

            var fieldNameVariable = `${field.toLowerCase()}Field`;
            importAliases += `${fieldNameVariable} = ${fieldNameImport};\n\t`;
            variableAssignments += `${field.toLowerCase()} = "";\n\t`;
            createFieldsHtml += `<lightning-input-field field-name={${fieldNameVariable}} value={${field.toLowerCase()}}></lightning-input-field>\n\t\t\t\t`;
            editFieldsHtml += `<lightning-input-field field-name={${fieldNameVariable}}></lightning-input-field>\n\t\t\t\t`;
        });
        templateVariables[CodeBuilder.TEMPLATE_FIELDS] = fields;
        templateVariables[CodeBuilder.TEMPLATE_IMPORTS] = imports;
        templateVariables[
            CodeBuilder.TEMPLATE_LIGHTNING_INPUT_CREATE_FIELDS_HTML
        ] = createFieldsHtml;
        templateVariables[
            CodeBuilder.TEMPLATE_LIGHTNING_INPUT_EDIT_FIELDS_HTML
        ] = editFieldsHtml;
        templateVariables[CodeBuilder.TEMPLATE_VARIABLES] = importAliases;
        templateVariables[CodeBuilder.TEMPLATE_VARIABLE_ASSIGNMENTS] =
            variableAssignments;

        return templateVariables;
    }
}
