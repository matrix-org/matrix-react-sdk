import { MatrixEvent } from "matrix-js-sdk/src/models/event";
import { RightPanelPhases } from "../../stores/RightPanelStorePhases";
import { Action } from "../actions";
import dis from '../dispatcher';
import { SetRightPanelPhasePayload } from "../payloads/SetRightPanelPhasePayload";

export const dispatchShowThreadEvent = (event: MatrixEvent) => {
    dis.dispatch({
        action: Action.SetRightPanelPhase,
        phase: RightPanelPhases.ThreadView,
        refireParams: {
            event,
        },
    });
};

export const dispatchShowThreadsPanelEvent = () => {
    dis.dispatch<SetRightPanelPhasePayload>({
        action: Action.SetRightPanelPhase,
        phase: RightPanelPhases.ThreadPanel,
    });
};

