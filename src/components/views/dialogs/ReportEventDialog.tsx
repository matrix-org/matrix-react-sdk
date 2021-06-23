/*
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import React from 'react';
import * as sdk from '../../../index';
import { _t } from '../../../languageHandler';
import { ensureDMExists } from "../../../createRoom";
import { IDialogProps } from "./IDialogProps";
import {MatrixEvent} from "matrix-js-sdk/src/models/event";
import {MatrixClientPeg} from "../../../MatrixClientPeg";
import SdkConfig from '../../../SdkConfig';
import Markdown from '../../../Markdown';
import {replaceableComponent} from "../../../utils/replaceableComponent";
import SettingsStore from "../../../settings/SettingsStore";
import StyledRadioButton from "../elements/StyledRadioButton";

interface IProps extends IDialogProps {
    mxEvent: MatrixEvent;
}

interface IState {
    // A free-form text describing the abuse.
    reason: string;
    busy: boolean;
    err?: string;
    // If we know it, the nature of the abuse, as specified by MSC3215.
    nature?: EXTENDED_NATURE;
}


const MODERATED_BY_STATE_EVENT_TYPE = [
    "org.matrix.msc3215.room.moderation.moderated_by",
    /**
     * Unprefixed state event. Not ready for prime time.
     *
     * "m.room.moderation.moderated_by"
     */
];

const ABUSE_EVENT_TYPE = "org.matrix.msc3215.abuse.report";

// Standard abuse natures.
enum NATURE {
    DISAGREEMENT = "org.matrix.msc3215.abuse.nature.disagreement",
    TOXIC = "org.matrix.msc3215.abuse.nature.toxic",
    ILLEGAL = "org.matrix.msc3215.abuse.nature.illegal",
    SPAM = "org.matrix.msc3215.abuse.nature.spam",
    OTHER = "org.matrix.msc3215.abuse.nature.other",
}

enum NON_STANDARD_NATURE {
    // Non-standard abuse nature.
    // It should never leave the client - we use it to fallback to
    // server-wide abuse reporting.
    ADMIN = "non-standard.abuse.nature.admin"
}

type EXTENDED_NATURE = NATURE | NON_STANDARD_NATURE;

type Moderation = {
    // The id of the moderation room.
    moderationRoomId: string;
    // The id of the bot in charge of forwarding abuse reports to the moderation room.
    moderationBotUserId: string;
}
/*
 * A dialog for reporting an event.
 *
 * The actual content of the dialog will depend on two things:
 *
 * 1. Is `feature_report_to_moderators` enabled?
 * 2. Does the room support moderation as per MSC3215, i.e. is there
 *    a well-formed state event `m.room.moderation.moderated_by`
 *    /`org.matrix.msc3215.room.moderation.moderated_by`?
 */
@replaceableComponent("views.dialogs.ReportEventDialog")
export default class ReportEventDialog extends React.Component<IProps, IState> {
    // If the room supports moderation, the moderation information.
    private moderation?: Moderation;

    constructor(props: IProps) {
        super(props);

        let moderatedByRoomId = null;
        let moderatedByUserId = null;

        if (SettingsStore.getValue("feature_report_to_moderators")) {
            // The client supports reporting to moderators.
            // Does the room support it, too?

            // Extract state events to determine whether we should display
            const client = MatrixClientPeg.get();
            const room = client.getRoom(props.mxEvent.getRoomId());

            for (const stateEventType of MODERATED_BY_STATE_EVENT_TYPE) {
                const stateEvent = room.currentState.getStateEvents(stateEventType, stateEventType);
                if (!stateEvent) {
                    continue;
                }
                if (Array.isArray(stateEvent)) {
                    // Internal error.
                    throw new TypeError(`getStateEvents(${stateEventType}, ${stateEventType}) ` +
                        "should return at most one state event");
                }
                const event = stateEvent.event;
                if (!("content" in event) || typeof event["content"] != "object") {
                    // The room is improperly configured.
                    // Display this debug message for the sake of moderators.
                    console.debug("Moderation error", "state event", stateEventType,
                        "should have an object field `content`, got", event);
                    continue;
                }
                const content = event["content"];
                if (!("room_id" in content) || typeof content["room_id"] != "string") {
                    // The room is improperly configured.
                    // Display this debug message for the sake of moderators.
                    console.debug("Moderation error", "state event", stateEventType,
                        "should have a string field `content.room_id`, got", event);
                    continue;
                }
                if (!("user_id" in content) || typeof content["user_id"] != "string") {
                    // The room is improperly configured.
                    // Display this debug message for the sake of moderators.
                    console.debug("Moderation error", "state event", stateEventType,
                        "should have a string field `content.user_id`, got", event);
                    continue;
                }
                moderatedByRoomId = content["room_id"];
                moderatedByUserId = content["user_id"];
            }

            if (moderatedByRoomId && moderatedByUserId) {
                // The room supports moderation.
                this.moderation = {
                    moderationRoomId: moderatedByRoomId,
                    moderationBotUserId: moderatedByUserId,
                };
            }
        }

        this.state = {
            // A free-form text describing the abuse.
            reason: "",
            busy: false,
            err: null,
            // If specified, the nature of the abuse, as specified by MSC3215.
            nature: null,
        };
    }

    // The user has written down a freeform description of the abuse.
    private onReasonChange = ({target: {value: reason}}): void => {
        this.setState({ reason });
    };

    // The user has clicked on a nature.
    private onNatureChosen = (e: React.FormEvent<HTMLInputElement>): void => {
        this.setState({ nature: e.currentTarget.value as EXTENDED_NATURE});
    };

    // The user has clicked "cancel".
    private onCancel = (): void => {
        this.props.onFinished(false);
    };

    // The user has clicked "submit".
    private onSubmit = async () => {
        let reason = this.state.reason || "";
        reason = reason.trim();
        if (this.moderation) {
            // This room supports moderation.
            // We need a nature.
            // If the nature is `NATURE.OTHER` or `NON_STANDARD_NATURE.ADMIN`, we also need a `reason`.
            if (!this.state.nature ||
                    ((this.state.nature == NATURE.OTHER || this.state.nature == NON_STANDARD_NATURE.ADMIN)
                        && !reason)
            ) {
                this.setState({
                    err: _t("Please fill why you're reporting."),
                });
                return;
            }
        } else {
            // This room does not support moderation.
            // We need a `reason`.
            if (!reason) {
                this.setState({
                    err: _t("Please fill why you're reporting."),
                });
                return;
            }
        }

        this.setState({
            busy: true,
            err: null,
        });

        try {
            const client = MatrixClientPeg.get();
            const ev = this.props.mxEvent;
            if (this.moderation && this.state.nature != NON_STANDARD_NATURE.ADMIN) {
                const nature: NATURE = this.state.nature;

                // Report to moderators through to the dedicated bot,
                // as configured in the room's state events.
                const dmRoomId = await ensureDMExists(client, this.moderation.moderationBotUserId);
                await client.sendEvent(dmRoomId, ABUSE_EVENT_TYPE, {
                    event_id: ev.getId(),
                    room_id: ev.getRoomId(),
                    moderated_by_id: this.moderation.moderationRoomId,
                    nature,
                    reporter: client.getUserId(),
                    comment: this.state.reason.trim(),
                });
            } else {
                // Report to homeserver admin through the dedicated Matrix API.
                await client.reportEvent(ev.getRoomId(), ev.getId(), -100, this.state.reason.trim());
            }
            this.props.onFinished(true);
        } catch (e) {
            this.setState({
                busy: false,
                err: e.message,
            });
        }
    };

    render() {
        const BaseDialog = sdk.getComponent('views.dialogs.BaseDialog');
        const DialogButtons = sdk.getComponent('views.elements.DialogButtons');
        const Loader = sdk.getComponent('elements.Spinner');
        const Field = sdk.getComponent('elements.Field');

        let error = null;
        if (this.state.err) {
            error = <div className="error">
                {this.state.err}
            </div>;
        }

        let progress = null;
        if (this.state.busy) {
            progress = (
                <div className="progress">
                    <Loader />
                </div>
            );
        }

        const adminMessageMD =
            SdkConfig.get().reportEvent &&
            SdkConfig.get().reportEvent.adminMessageMD;
        let adminMessage;
        if (adminMessageMD) {
            const html = new Markdown(adminMessageMD).toHTML({ externalLinks: true });
            adminMessage = <p dangerouslySetInnerHTML={{ __html: html }} />;
        }

        if (this.moderation) {
            // Display report-to-moderator dialog.
            // We let the user pick a nature.
            const client = MatrixClientPeg.get();
            const homeServerName = SdkConfig.get()["validated_server_config"].hsName;
            let subtitle;
            switch (this.state.nature) {
                case NATURE.DISAGREEMENT:
                    subtitle = _t("What this user is writing is wrong.\n" +
                        "This will be reported to the room moderators.");
                    break;
                case NATURE.TOXIC:
                    subtitle = _t("This user is displaying toxic behaviour, " +
                        "for instance by insulting other users or sharing " +
                        " adult-only content in a family-friendly room " +
                        " or otherwise violating the rules of this room.\n" +
                        "This will be reported to the room moderators.");
                    break;
                case NATURE.ILLEGAL:
                    subtitle = _t("This user is displaying illegal behaviour, " +
                        "for instance by doxing people or threatening violence.\n" +
                        "This will be reported to the room moderators who may escalate this to legal authorities.");
                    break;
                case NATURE.SPAM:
                    subtitle = _t("This user is spamming the room with ads, links to ads or to propaganda.\n" +
                        "This will be reported to the room moderators.");
                    break;
                case NON_STANDARD_NATURE.ADMIN:
                    if (client.isRoomEncrypted(this.props.mxEvent.getRoomId())) {
                        subtitle = _t("This room is dedicated to illegal or toxic content " +
                            "or the moderators fail to moderate illegal or toxic content.\n" +
                            "This will be reported to the administrators of %(homeserver)s. " +
                            "The administrators will NOT be able to read the encrypted content of this room.",
                        { homeserver: homeServerName });
                    } else {
                        subtitle = _t("This room is dedicated to illegal or toxic content " +
                            "or the moderators fail to moderate illegal or toxic content.\n" +
                            " This will be reported to the administrators of %(homeserver)s.",
                        { homeserver: homeServerName });
                    }
                    break;
                case NATURE.OTHER:
                    subtitle = _t("Any other reason. Please describe the problem.\n" +
                        "This will be reported to the room moderators.");
                    break;
                default:
                    subtitle = _t("Please pick a nature and describe what makes this message abusive.");
                    break;
            }

            return (
                <BaseDialog
                    className="mx_ReportEventDialog"
                    onFinished={this.props.onFinished}
                    title={_t('Report Content')}
                    contentId='mx_ReportEventDialog'
                >
                    <div>
                        <StyledRadioButton
                            name = "nature"
                            value = { NATURE.DISAGREEMENT }
                            checked = { this.state.nature == NATURE.DISAGREEMENT }
                            onChange = { this.onNatureChosen }
                        >
                            {_t('Disagree')}
                        </StyledRadioButton>
                        <StyledRadioButton
                            name = "nature"
                            value = { NATURE.TOXIC }
                            checked = { this.state.nature == NATURE.TOXIC }
                            onChange = { this.onNatureChosen }
                        >
                            {_t('Toxic Behaviour')}
                        </StyledRadioButton>
                        <StyledRadioButton
                            name = "nature"
                            value = { NATURE.ILLEGAL }
                            checked = { this.state.nature == NATURE.ILLEGAL }
                            onChange = { this.onNatureChosen }
                        >
                            {_t('Illegal Content')}
                        </StyledRadioButton>
                        <StyledRadioButton
                            name = "nature"
                            value = { NATURE.SPAM }
                            checked = { this.state.nature == NATURE.SPAM }
                            onChange = { this.onNatureChosen }
                        >
                            {_t('Spam or propaganda')}
                        </StyledRadioButton>
                        <StyledRadioButton
                            name = "nature"
                            value = { NON_STANDARD_NATURE.ADMIN }
                            checked = { this.state.nature == NON_STANDARD_NATURE.ADMIN }
                            onChange = { this.onNatureChosen }
                        >
                            {_t('Report the entire room')}
                        </StyledRadioButton>
                        <StyledRadioButton
                            name = "nature"
                            value = { NATURE.OTHER }
                            checked = { this.state.nature == NATURE.OTHER }
                            onChange = { this.onNatureChosen }
                        >
                            {_t('Other')}
                        </StyledRadioButton>
                        <p>
                            {subtitle}
                        </p>
                        <Field
                            className="mx_ReportEventDialog_reason"
                            element="textarea"
                            label={_t("Reason")}
                            rows={5}
                            onChange={this.onReasonChange}
                            value={this.state.reason}
                            disabled={this.state.busy}
                        />
                        {progress}
                        {error}
                    </div>
                    <DialogButtons
                        primaryButton={_t("Send report")}
                        onPrimaryButtonClick={this.onSubmit}
                        focus={true}
                        onCancel={this.onCancel}
                        disabled={this.state.busy}
                    />
                </BaseDialog>
            );
        }
        // Report to homeserver admin.
        // Currently, the API does not support natures.
        return (
            <BaseDialog
                className="mx_ReportEventDialog"
                onFinished={this.props.onFinished}
                title={_t('Report Content to Your Homeserver Administrator')}
                contentId='mx_ReportEventDialog'
            >
                <div className="mx_ReportEventDialog" id="mx_ReportEventDialog">
                    <p>
                        {
                            _t("Reporting this message will send its unique 'event ID' to the administrator of " +
                                "your homeserver. If messages in this room are encrypted, your homeserver " +
                                "administrator will not be able to read the message text or view any files " +
                                "or images.")
                        }
                    </p>
                    {adminMessage}
                    <Field
                        className="mx_ReportEventDialog_reason"
                        element="textarea"
                        label={_t("Reason")}
                        rows={5}
                        onChange={this.onReasonChange}
                        value={this.state.reason}
                        disabled={this.state.busy}
                    />
                    {progress}
                    {error}
                </div>
                <DialogButtons
                    primaryButton={_t("Send report")}
                    onPrimaryButtonClick={this.onSubmit}
                    focus={true}
                    onCancel={this.onCancel}
                    disabled={this.state.busy}
                />
            </BaseDialog>
        );
    }
}
