import { Action } from "../actions"

export interface ViewHomePagePayload extends ActionPayload {
    action: Action.ViewHomePage;
    // elsint-disable-next-line camelcase
    context_switch?: boolean;
    justRegistered?: boolean;
}