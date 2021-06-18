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

import React, {PureComponent} from 'react';
import * as sdk from '../../../index';
import { _t } from '../../../languageHandler';
import { ensureDMExists } from '../../../createRoom';
import PropTypes from "prop-types";
import {MatrixEvent} from "matrix-js-sdk/src/models/event";
import {MatrixClientPeg} from "../../../MatrixClientPeg";
import SdkConfig from '../../../SdkConfig';
import Markdown from '../../../Markdown';
import {replaceableComponent} from "../../../utils/replaceableComponent";
import SettingsStore from '../../../settings/SettingsStore';
import StyledRadioButton from "../elements/StyledRadioButton";

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
const NATURE_DISAGREEMENT = "org.matrix.msc3215.abuse.nature.disagreement";
const NATURE_TOXIC = "org.matrix.msc3215.abuse.nature.toxic";
const NATURE_ILLEGAL = "org.matrix.msc3215.abuse.nature.illegal";
const NATURE_SPAM = "org.matrix.msc3215.abuse.nature.spam";
const NATURE_OTHER = "org.matrix.msc3215.abuse.nature.other";
// Non-standard abuse nature.
// It should never leave the client - we use it to fallback to
// server-wide abuse reporting.
const NATURE_ADMIN = "non-standard.abuse.nature.admin";

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
export default class ReportEventDialog extends PureComponent {
    static propTypes = {
        mxEvent: PropTypes.instanceOf(MatrixEvent).isRequired,
        onFinished: PropTypes.func.isRequired,
    };

    constructor(props) {
        super(props);

        // If non-null, the id of the moderation room.
        this.moderatedByRoomId = null;

        // If non-null, the id of the bot in charge of forwarding abuse reports to the moderation room.
        this.moderatedByUserId = null;

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
                this.moderatedByRoomId = content["room_id"];
                this.moderatedByUserId = content["user_id"];
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

    _onReasonChange = ({target: {value: reason}}) => {
        this.setState({ reason });
    };

    // The user has clicked on a nature.
    _onNatureChosen = e => {
        this.setState({ nature: e.target.value });
    };

    _onCancel = () => {
        this.props.onFinished(false);
    };

    _onSubmit = async () => {
        let reason = this.state.reason || "";
        reason = reason.trim();
        if (this.moderatedByUserId && this.moderatedByRoomId) {
            // This room supports moderation.
            // We need a nature.
            // If the nature is `NATURE_OTHER` or `NATURE_ADMIN`, we also need a `reason`.
            if (!this.state.nature ||
                    ((this.state.nature == NATURE_OTHER || this.state.nature == NATURE_ADMIN)
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
            if (this.moderatedByRoomId && this.moderatedByUserId && this.state.nature != NATURE_ADMIN) {
                // Report to moderators through to the dedicated bot,
                // as configured in the room's state events.
                const client = MatrixClientPeg.get();
                const dmRoomId = await ensureDMExists(client, this.moderatedByUserId);
                const ev = this.props.mxEvent;
                await MatrixClientPeg.get().sendEvent(dmRoomId, ABUSE_EVENT_TYPE, {
                    event_id: ev.getId(),
                    room_id: ev.getRoomId(),
                    moderated_by_id: this.moderatedByRoomId,
                    nature: this.state.nature,
                    reporter: MatrixClientPeg.get().getUserId(),
                    comment: this.state.reason.trim(),
                });
                this.props.onFinished(true);
            } else {
                // Report to homeserver admin through the dedicated Matrix API.
                const ev = this.props.mxEvent;
                await MatrixClientPeg.get().reportEvent(ev.getRoomId(), ev.getId(), -100, this.state.reason.trim());
                this.props.onFinished(true);
            }
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

        if (this.moderatedByRoomId && this.moderatedByUserId) {
            // Display report-to-moderator dialog.
            // We let the user pick a nature.
            const client = MatrixClientPeg.get();
            const homeServerName = SdkConfig.get()["validated_server_config"].hsName;
            let subtitle;
            switch (this.state.nature) {
                case NATURE_DISAGREEMENT:
                    subtitle = _t("Abuse: What this user is writing is wrong.");
                    break;
                case NATURE_TOXIC:
                    subtitle = _t("Abuse: This user is displaying toxic behavior.");
                    break;
                case NATURE_ILLEGAL:
                    subtitle = _t("Abuse: This user is displaying illegal behavior.");
                    break;
                case NATURE_SPAM:
                    subtitle = _t("Abuse: This user is spamming the room.");
                    break;
                case NATURE_ADMIN:
                    if (client.isRoomEncrypted(this.props.mxEvent.getRoomId())) {
                        subtitle = _t("Abuse: Report the entire room to %(homeserver)s admin. Encrypted.",
                            { homeserver: homeServerName });
                    } else {
                        subtitle = _t("Abuse: Report the entire room to %(homeserver)s admin. Unencrypted.",
                            { homeserver: homeServerName });
                    }
                    break;
                case NATURE_OTHER:
                    subtitle = _t("Abuse: Any other reason.");
                    break;
                default:
                    subtitle = _t("Abuse: What makes this message abusive?");
                    break;
            }

            return (
                <BaseDialog
                    className="mx_BugReportDialog" //YORIC: Really?
                    onFinished={this.props.onFinished}
                    title={_t('Report Content')}
                    contentId='mx_ReportEventDialog'
                >
                    <div>
                        <StyledRadioButton
                            name = "nature"
                            value = { NATURE_DISAGREEMENT }
                            checked = { this.state.nature == NATURE_DISAGREEMENT }
                            onChange = { this._onNatureChosen }
                        >
                            {_t('Abuse nature: Disagreement')}
                        </StyledRadioButton>
                        <StyledRadioButton
                            name = "nature"
                            value = { NATURE_TOXIC }
                            checked = { this.state.nature == NATURE_TOXIC }
                            onChange = { this._onNatureChosen }
                        >
                            {_t('Abuse nature: Toxic Behavior')}
                        </StyledRadioButton>
                        <StyledRadioButton
                            name = "nature"
                            value = { NATURE_ILLEGAL }
                            checked = { this.state.nature == NATURE_ILLEGAL }
                            onChange = { this._onNatureChosen }
                        >
                            {_t('Abuse nature: Illegal Content')}
                        </StyledRadioButton>
                        <StyledRadioButton
                            name = "nature"
                            value = { NATURE_SPAM }
                            checked = { this.state.nature == NATURE_SPAM }
                            onChange = { this._onNatureChosen }
                        >
                            {_t('Abuse nature: Spam, propaganda, ...')}
                        </StyledRadioButton>
                        <StyledRadioButton
                            name = "nature"
                            value = { NATURE_ADMIN }
                            checked = { this.state.nature == NATURE_ADMIN }
                            onChange = { this._onNatureChosen }
                        >
                            {_t('Abuse nature: Report the entire room to your homeserver admin')}
                        </StyledRadioButton>
                        <StyledRadioButton
                            name = "nature"
                            value = { NATURE_OTHER }
                            checked = { this.state.nature == NATURE_OTHER }
                            onChange = { this._onNatureChosen }
                        >
                            {_t('Abuse nature: Anything else')}
                        </StyledRadioButton>
                        <p>
                            {subtitle}
                        </p>
                        <Field
                            className="mx_ReportEventDialog_reason"
                            element="textarea"
                            label={_t("Reason")}
                            rows={5}
                            onChange={this._onReasonChange}
                            value={this.state.reason}
                            disabled={this.state.busy}
                        />
                        {progress}
                        {error}
                    </div>
                    <DialogButtons
                        primaryButton={_t("Send report")}
                        onPrimaryButtonClick={this._onSubmit}
                        focus={true}
                        onCancel={this._onCancel}
                        disabled={this.state.busy}
                    />
                </BaseDialog>
            );
        } else {
            // Report to homeserver admin.
            // Currently, the API does not support natures.
            return (
                <BaseDialog
                    className="mx_BugReportDialog"
                    onFinished={this.props.onFinished}
                    title={_t('Report Content to Your Homeserver Administrator')}
                    contentId='mx_ReportEventDialog'
                >
                    <div className="mx_ReportEventDialog" id="mx_ReportEventDialog">
                        <p>
                            {
                                _t("Reporting this message will send its unique 'event ID' to the administrator of " +
                                    "your homeserver. If messages in this room are encrypted, your homeserver " +
                                    "administrator will not be able to read the message text or view any files or images.")
                            }
                        </p>
                        {adminMessage}
                        <Field
                            className="mx_ReportEventDialog_reason"
                            element="textarea"
                            label={_t("Reason")}
                            rows={5}
                            onChange={this._onReasonChange}
                            value={this.state.reason}
                            disabled={this.state.busy}
                        />
                        {progress}
                        {error}
                    </div>
                    <DialogButtons
                        primaryButton={_t("Send report")}
                        onPrimaryButtonClick={this._onSubmit}
                        focus={true}
                        onCancel={this._onCancel}
                        disabled={this.state.busy}
                    />
                </BaseDialog>
            );
        }
    }
}
