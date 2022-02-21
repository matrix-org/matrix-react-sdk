import { Action } from "../actions";
import { ActionPayload } from "../payloads";

export interface ViewHomePagePayload extends ActionPayload {
    action: Action.ViewHomePage;
    // eslint-disable-next-line camelcase
    context_switch?: boolean;
    justRegistered?: boolean;
}
