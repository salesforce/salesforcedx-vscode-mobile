import * as vscode from "vscode";
import { QuickPickItem } from "vscode";
import { QuickPickItemKind } from "vscode";
import { UEMBuilder } from "./utils/uemBuilder";

const GLOBAL_ACTIONS_CARD_LABEL = "Global Actions";
const TIMED_LIST_CARD_LABEL = "Timed List";
const RECORD_LIST_CARD_LABEL = "Record List";
const FINISHED_LABEL = "Finished";
export class LandingPageCommand {

  /**
   * Prompts user, in a loop, for cards to include on the landing page. Each card has different parameters
   * which we will need to collect as well.
   */
  public static async execute() {
    var selectedCardTypes: QuickPickItem[] = [];

    var selectedCardType: vscode.QuickPickItem | undefined;

    while (selectedCardType?.label !== "Finished") {
      selectedCardType = await vscode.window.showQuickPick(cardTypes, {
        placeHolder: "Select a card type to add to the landing page:",
        canPickMany: false,
        ignoreFocusOut: true
      });

      if (selectedCardType === undefined) {
        return;
      }

      if (selectedCardType!.label !== FINISHED_LABEL) {
        selectedCardTypes.push(selectedCardType);
      }
    }

    var uem = new UEMBuilder();
    for (var card of selectedCardTypes) {
      if (card.label == GLOBAL_ACTIONS_CARD_LABEL) {
        uem = LandingPageCommand.configureGlobalActionsCard(uem);
      } else if (card.label === RECORD_LIST_CARD_LABEL) {
        uem = LandingPageCommand.configureRecordListCard(uem);
      } else if (card.label === TIMED_LIST_CARD_LABEL) {
        uem = LandingPageCommand.configureTimedListCard(uem);
      }
    }

    console.log("The Landing Page UEM is: ");
    console.log(uem.build());
  }

  /**
   * 
   * @returns json representation of a global actions card.
   */
  static configureGlobalActionsCard(uem: UEMBuilder): UEMBuilder {
    return uem.addGlobalActionCard();
  }

  /**
   * 
   * @returns json representation of a record list card.
   */
  static configureRecordListCard(uem: UEMBuilder): UEMBuilder {

    return uem;
  }

  /**
   * Gather input from user on building a Timed List card. This will require obtaining the following params:
   * - Object Type (it appears some are filtered out?)
   * - startDate - will need to look for fields of 'datetime' and ask the user if this field is the start field to use
   * - endDate - same as startDate for the end field to use
   * - nameField - we can automatically look for this (some objects do not have one)
   * - subField1 - the field to use under the name field
   * - subField2 - the field to use under the name field
   * - nbrRecords - the max number of records to show on the card
   * @returns json representation of a timed and sorted list card.
   */
  static configureTimedListCard(uem: UEMBuilder): UEMBuilder {
    return uem;
  }
}

const cardTypes: QuickPickItem[] =
  [
    {
      label: `${GLOBAL_ACTIONS_CARD_LABEL}`,
      description: "A card showing the LWC Global Quick Actions defined in the org."
    },
    {
      label: `${RECORD_LIST_CARD_LABEL}`,
      description: "A card showing a list of records."
    },
    {
      label: `${TIMED_LIST_CARD_LABEL}`,
      description: "A card showing a list of records filtered and sorted by a date/time range."
    },
    {
      label: "",
      kind: QuickPickItemKind.Separator
    },
    {
      label: `${FINISHED_LABEL}`,
      description: "Finish and generate the landing page."
    }
  ];