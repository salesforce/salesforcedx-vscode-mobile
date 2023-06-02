import * as vscode from "vscode";
import { QuickPickItem } from "vscode";
import { QuickPickItemKind } from "vscode";
import { UEMBuilder } from "../utils/uemBuilder";

export class LandingPageCommand {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static readonly GLOBAL_ACTIONS_CARD_LABEL = "Global Actions";
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static readonly TIMED_LIST_CARD_LABEL = "Timed List";
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static readonly RECORD_LIST_CARD_LABEL = "Record List";
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static readonly FINISHED_LABEL = "Finished";

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

      if (selectedCardType!.label !== LandingPageCommand.FINISHED_LABEL) {
        selectedCardTypes.push(selectedCardType);
      }
    }

    var uem = new UEMBuilder();
    for (var card of selectedCardTypes) {
      if (card.label === LandingPageCommand.GLOBAL_ACTIONS_CARD_LABEL) {
        uem = LandingPageCommand.configureGlobalActionsCard(uem);
      } else if (card.label === LandingPageCommand.RECORD_LIST_CARD_LABEL) {
        uem = LandingPageCommand.configureRecordListCard(uem);
      } else if (card.label === LandingPageCommand.TIMED_LIST_CARD_LABEL) {
        uem = LandingPageCommand.configureTimedListCard(uem);
      }
    }

    return uem.build();
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
    // TODO
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
    // TODO
    return uem;
  }
}

const cardTypes: QuickPickItem[] =
  [
    {
      label: `${LandingPageCommand.GLOBAL_ACTIONS_CARD_LABEL}`,
      description: "A card showing the LWC Global Quick Actions defined in the org."
    },
    {
      label: `${LandingPageCommand.RECORD_LIST_CARD_LABEL}`,
      description: "A card showing a list of records."
    },
    {
      label: `${LandingPageCommand.TIMED_LIST_CARD_LABEL}`,
      description: "A card showing a list of records filtered and sorted by a date/time range."
    },
    {
      label: "",
      kind: QuickPickItemKind.Separator
    },
    {
      label: `${LandingPageCommand.FINISHED_LABEL}`,
      description: "Finish and generate the landing page."
    }
  ];