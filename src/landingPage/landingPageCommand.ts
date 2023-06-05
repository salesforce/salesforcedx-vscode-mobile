import { window, QuickPickItem, QuickPickItemKind } from "vscode";
import { UEMBuilder } from "./uemBuilder";
import { messages } from "../messages/messages";
import { OrgUtils } from "./orgUtils";
import { UIUtils } from "./uiUtils";

export class LandingPageCommand {

  // TODO: Decide how to handle these eslint exceptions below -- either disable check line-by-line, or change naming conventions
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static readonly GLOBAL_ACTIONS_CARD_LABEL = messages.getMessage('card_name_global_actions');
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static readonly TIMED_LIST_CARD_LABEL = messages.getMessage('card_name_timed_list');
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static readonly RECORD_LIST_CARD_LABEL = messages.getMessage('card_name_record_list');
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static readonly FINISHED_LABEL = messages.getMessage('finished');;


  /**
   * Prompts user, in a loop, for cards to include on the landing page. Each card has different parameters
   * which we will need to collect as well.
   */
  public static async buildLandingPage() {
    let selectedCardType: QuickPickItem | undefined;

    let uem = new UEMBuilder();

    while (selectedCardType?.label !== LandingPageCommand.FINISHED_LABEL) {
      selectedCardType = await window.showQuickPick(cardTypes, {
        placeHolder: messages.getMessage('quickpick_card_placeholder'),
        canPickMany: false,
        ignoreFocusOut: true
      });

      if (!selectedCardType) {
        return;
      }

      // add the card to UEM
      if (selectedCardType.label === LandingPageCommand.GLOBAL_ACTIONS_CARD_LABEL) {
        uem = LandingPageCommand.configureGlobalActionsCard(uem);
      } else if (selectedCardType.label === LandingPageCommand.RECORD_LIST_CARD_LABEL) {
        uem = await LandingPageCommand.configureRecordListCard(uem);
      } else if (selectedCardType.label === LandingPageCommand.TIMED_LIST_CARD_LABEL) {
        uem = await LandingPageCommand.configureTimedListCard(uem);
      }

      // TODO: Show progress somehow
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
   * A Record List card shows a customized card for a particular SObject. It needs the following params from the user:
   * - SObject Name
   * - Primary field
   * - Secondary field
   * - OrderBy field
   * - OrderBy direction (Ascending or Descending)
   * - MaxItems (number from 3-8)
   * - SwipeActions
   * @returns json representation of a record list card.
   */
  static async configureRecordListCard(uem: UEMBuilder): Promise<UEMBuilder> {
    const selectedItem = await UIUtils.showQuickPick(
      messages.getMessage('quickpick_sobject_record_list'),
      messages.getMessage('progress_message_retrieving_sobjects'),
      () => {
        return new Promise<QuickPickItem[]>(async (resolve, reject) => {
          const sobjectQuickPickItems = (await OrgUtils.getSobjects()).map((sobject) => {
            return {
              label: sobject.labelPlural,
              detail: sobject.apiName
            };
          });
          resolve(sobjectQuickPickItems);
        });
      });

    if (!selectedItem) {
      return uem;
    }

    const apiName = selectedItem.detail!;
    const labelPlural = selectedItem.label;

    // TODO: Get Primary field
    // TODO: Get Secondary field
    // TODO: Get OrderBy field
    // TODO: Get OrderBy direction 
    // TODO: Get MaxItems
    // TODO: Swipe Actions

    return Promise.resolve(uem.addRecordListCard(apiName, labelPlural));
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
  static async configureTimedListCard(uem: UEMBuilder): Promise<UEMBuilder> {
    return Promise.resolve(uem.addTimedListCard());
  }
}

const cardTypes: QuickPickItem[] =
  [
    {
      label: `${LandingPageCommand.GLOBAL_ACTIONS_CARD_LABEL}`,
      description: messages.getMessage('desc_global_action_card'),
    },
    {
      label: `${LandingPageCommand.RECORD_LIST_CARD_LABEL}`,
      description: messages.getMessage('desc_record_list_card'),
    },
    {
      label: `${LandingPageCommand.TIMED_LIST_CARD_LABEL}`,
      description: messages.getMessage('desc_timed_list_card'),
    },
    {
      label: "",
      kind: QuickPickItemKind.Separator
    },
    {
      label: `${LandingPageCommand.FINISHED_LABEL}`,
      description: messages.getMessage('desc_finished')
    }
  ];
