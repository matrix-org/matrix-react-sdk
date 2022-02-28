import { MatrixClient } from "matrix-js-sdk";
import { makeLocationContent } from "matrix-js-sdk/src/content-helpers";
import { logger } from "matrix-js-sdk/src/logger";

import { _t } from "../../../languageHandler";
import Modal from "../../../Modal";
import QuestionDialog from "../dialogs/QuestionDialog";

export const shareLocation = (client: MatrixClient, roomId: string, openMenu: () => void) =>
    (uri: string, ts: number) => {
        if (!uri) return false;
        try {
            const text = textForLocation(uri, ts, null);
            client.sendMessage(
                roomId,
                makeLocationContent(text, uri, ts, null),
            );
        } catch (e) {
            logger.error("We couldn’t send your location", e);

            const analyticsAction = 'We couldn’t send your location';
            const params = {
                title: _t("We couldn’t send your location"),
                description: _t(
                    "Element could not send your location. Please try again later."),
                button: _t('Try again'),
                cancelButton: _t('Cancel'),
                onFinished: (tryAgain: boolean) => {
                    if (tryAgain) {
                        openMenu();
                    }
                },
            };
            Modal.createTrackedDialog(analyticsAction, '', QuestionDialog, params);
        }
        return true;
    };

export function textForLocation(
    uri: string,
    ts: number,
    description: string | null,
): string {
    const date = new Date(ts).toISOString();
    if (description) {
        return `Location "${description}" ${uri} at ${date}`;
    } else {
        return `Location ${uri} at ${date}`;
    }
}
