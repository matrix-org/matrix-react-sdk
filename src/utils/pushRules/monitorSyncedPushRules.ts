import { MatrixEvent } from "matrix-js-sdk/src/matrix";

export const monitorSyncedPushRules = async(accountDataEvent: MatrixEvent, matrixClient: MatrixClient): Promise<void> => {
    console.log('hhh monitorSyncedPushRules', accountDataEvent)
}