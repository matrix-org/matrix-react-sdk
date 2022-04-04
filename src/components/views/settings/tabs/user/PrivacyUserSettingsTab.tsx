/*
Copyright 2019-2021 The Matrix.org Foundation C.I.C.

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
import { SERVICE_TYPES } from "matrix-js-sdk/src/service-types";
import { sleep } from "matrix-js-sdk/src/utils";
import { Room, RoomEvent } from "matrix-js-sdk/src/models/room";
import { logger } from "matrix-js-sdk/src/logger";
import { IThreepid } from "matrix-js-sdk/src/@types/threepids";

import { _t } from "../../../../../languageHandler";
import SdkConfig from "../../../../../SdkConfig";
import { Mjolnir } from "../../../../../mjolnir/Mjolnir";
import { ListRule } from "../../../../../mjolnir/ListRule";
import { BanList, RULE_SERVER, RULE_USER } from "../../../../../mjolnir/BanList";
import Modal from "../../../../../Modal";
import { MatrixClientPeg } from "../../../../../MatrixClientPeg";
import { replaceableComponent } from "../../../../../utils/replaceableComponent";
import ErrorDialog from "../../../dialogs/ErrorDialog";
import QuestionDialog from "../../../dialogs/QuestionDialog";
import AccessibleButton from "../../../elements/AccessibleButton";
import Field from "../../../elements/Field";
import { PosthogAnalytics } from '../../../../../PosthogAnalytics';
import Analytics from '../../../../../Analytics';
import SettingsFlag from '../../../elements/SettingsFlag';
import { SettingLevel } from '../../../../../settings/SettingLevel';
import { showDialog as showAnalyticsLearnMoreDialog } from "../../../dialogs/AnalyticsLearnMoreDialog";
import { ActionPayload } from '../../../../../dispatcher/payloads';
import dis from "../../../../../dispatcher/dispatcher";
import InlineSpinner from '../../../elements/InlineSpinner';
import SettingsStore, { CallbackFn } from '../../../../../settings/SettingsStore';
import { UIFeature } from '../../../../../settings/UIFeature';
import { Policies, Service, startTermsFlow } from "../../../../../Terms";
import IdentityAuthClient from "../../../../../IdentityAuthClient";
import { abbreviateUrl } from "../../../../../utils/UrlUtils";
import DiscoveryEmailAddresses from "../../discovery/EmailAddresses";
import DiscoveryPhoneNumbers from "../../discovery/PhoneNumbers";
import InlineTermsAgreement from "../../../terms/InlineTermsAgreement";
import SetIdServer from "../../SetIdServer";
import { getThreepidsWithBindStatus } from '../../../../../boundThreepids';
import Spinner from "../../../elements/Spinner";

interface IIgnoredUserProps {
    userId: string;
    onUnignored: (userId: string) => void;
    inProgress: boolean;
}

export class IgnoredUser extends React.Component<IIgnoredUserProps> {
    private onUnignoreClicked = (): void => {
        this.props.onUnignored(this.props.userId);
    };

    public render(): JSX.Element {
        const id = `mx_SecurityUserSettingsTab_ignoredUser_${this.props.userId}`;
        return (
            <div className='mx_SecurityUserSettingsTab_ignoredUser'>
                <AccessibleButton onClick={this.onUnignoreClicked} kind='primary_sm' aria-describedby={id} disabled={this.props.inProgress}>
                    { _t('Unignore') }
                </AccessibleButton>
                <span id={id}>{ this.props.userId }</span>
            </div>
        );
    }
}

interface IProps {
    closeSettingsFn: () => void;
}

interface IState {
    mjolnirEnabled: boolean;
    busy: boolean;
    newPersonalRule: string;
    newList: string;
    ignoredUserIds: string[];
    waitingUnignored: string[];
    managingInvites: boolean;
    invitedRoomIds: Set<string>;
    requiredPolicyInfo: {       // This object is passed along to a component for handling
        hasTerms: boolean;
        policiesAndServices: {
            service: Service;
            policies: Policies;
        }[]; // From the startTermsFlow callback
        agreedUrls: string[]; // From the startTermsFlow callback
        resolve: (values: string[]) => void; // Promise resolve function for startTermsFlow callback
    };
    idServerHasUnsignedTerms: boolean;
    emails: IThreepid[];
    msisdns: IThreepid[];
    loading3pids: boolean; // whether or not the emails and msisdns have been loaded
    idServerName: string;
    haveIdServer: boolean;
}

@replaceableComponent("views.settings.tabs.user.MjolnirUserSettingsTab")
export default class MjolnirUserSettingsTab extends React.Component<IProps, IState> {
    private dispatcherRef: string;
    private mjolnirWatcher: string;

    constructor(props) {
        super(props);

        // Get rooms we're invited to
        const invitedRoomIds = new Set(this.getInvitedRooms().map(room => room.roomId));

        this.state = {
            mjolnirEnabled: SettingsStore.getValue("feature_mjolnir"),
            busy: false,
            newPersonalRule: "",
            newList: "",
            ignoredUserIds: MatrixClientPeg.get().getIgnoredUsers(),
            waitingUnignored: [],
            managingInvites: false,
            invitedRoomIds,
            requiredPolicyInfo: {       // This object is passed along to a component for handling
                hasTerms: false,
                policiesAndServices: null, // From the startTermsFlow callback
                agreedUrls: null,          // From the startTermsFlow callback
                resolve: null,             // Promise resolve function for startTermsFlow callback
            },
            idServerHasUnsignedTerms: false,
            emails: [],
            msisdns: [],
            loading3pids: false,
            idServerName: null,
            haveIdServer: Boolean(MatrixClientPeg.get().getIdentityServerUrl()),
        };
    }

    private async getThreepidState(): Promise<void> {
        const cli = MatrixClientPeg.get();

        // Check to see if terms need accepting
        this.checkTerms();

        // Need to get 3PIDs generally for Account section and possibly also for
        // Discovery (assuming we have an IS and terms are agreed).
        let threepids = [];
        try {
            threepids = await getThreepidsWithBindStatus(cli);
        } catch (e) {
            const idServerUrl = MatrixClientPeg.get().getIdentityServerUrl();
            logger.warn(
                `Unable to reach identity server at ${idServerUrl} to check ` +
                `for 3PIDs bindings in Settings`,
            );
            logger.warn(e);
        }
        this.setState({
            emails: threepids.filter((a) => a.medium === 'email'),
            msisdns: threepids.filter((a) => a.medium === 'msisdn'),
            loading3pids: false,
        });
    }

    private onAction = ({ action }: ActionPayload) => {
        if (action === "ignore_state_changed") {
            const ignoredUserIds = MatrixClientPeg.get().getIgnoredUsers();
            const newWaitingUnignored = this.state.waitingUnignored.filter(e => ignoredUserIds.includes(e));
            this.setState({ ignoredUserIds, waitingUnignored: newWaitingUnignored });
        } else if (action === 'id_server_changed') {
            this.setState({ haveIdServer: Boolean(MatrixClientPeg.get().getIdentityServerUrl()) });
            this.getThreepidState();
        }
    };

    public componentDidMount(): void {
        this.dispatcherRef = dis.register(this.onAction);
        MatrixClientPeg.get().on(RoomEvent.MyMembership, this.onMyMembership);
        this.mjolnirWatcher = SettingsStore.watchSetting("feature_mjolnir", null, this.mjolnirChanged);
        this.getThreepidState();
    }

    public componentWillUnmount(): void {
        dis.unregister(this.dispatcherRef);
        MatrixClientPeg.get().removeListener(RoomEvent.MyMembership, this.onMyMembership);
        SettingsStore.unwatchSetting(this.mjolnirWatcher);
    }

    private mjolnirChanged: CallbackFn = (settingName, roomId, atLevel, newValue) => {
        // We can cheat because we know what levels a feature is tracked at, and how it is tracked
        this.setState({ mjolnirEnabled: newValue });
    };

    private updateAnalytics = (checked: boolean): void => {
        checked ? Analytics.enable() : Analytics.disable();
    };

    private onMyMembership = (room: Room, membership: string): void => {
        if (room.isSpaceRoom()) {
            return;
        }

        if (membership === "invite") {
            this.addInvitedRoom(room);
        } else if (this.state.invitedRoomIds.has(room.roomId)) {
            // The user isn't invited anymore
            this.removeInvitedRoom(room.roomId);
        }
    };

    private addInvitedRoom = (room: Room): void => {
        this.setState(({ invitedRoomIds }) => ({
            invitedRoomIds: new Set(invitedRoomIds).add(room.roomId),
        }));
    };

    private removeInvitedRoom = (roomId: string): void => {
        this.setState(({ invitedRoomIds }) => {
            const newInvitedRoomIds = new Set(invitedRoomIds);
            newInvitedRoomIds.delete(roomId);

            return {
                invitedRoomIds: newInvitedRoomIds,
            };
        });
    };

    private onUserUnignored = async (userId: string): Promise<void> => {
        const { ignoredUserIds, waitingUnignored } = this.state;
        const currentlyIgnoredUserIds = ignoredUserIds.filter(e => !waitingUnignored.includes(e));

        const index = currentlyIgnoredUserIds.indexOf(userId);
        if (index !== -1) {
            currentlyIgnoredUserIds.splice(index, 1);
            this.setState(({ waitingUnignored }) => ({ waitingUnignored: [...waitingUnignored, userId] }));
            MatrixClientPeg.get().setIgnoredUsers(currentlyIgnoredUserIds);
        }
    };

    private getInvitedRooms = (): Room[] => {
        return MatrixClientPeg.get().getRooms().filter((r) => {
            return r.hasMembershipState(MatrixClientPeg.get().getUserId(), "invite");
        });
    };

    private manageInvites = async (accept: boolean): Promise<void> => {
        this.setState({
            managingInvites: true,
        });

        // iterate with a normal for loop in order to retry on action failure
        const invitedRoomIdsValues = Array.from(this.state.invitedRoomIds);

        // Execute all acceptances/rejections sequentially
        const cli = MatrixClientPeg.get();
        const action = accept ? cli.joinRoom.bind(cli) : cli.leave.bind(cli);
        for (let i = 0; i < invitedRoomIdsValues.length; i++) {
            const roomId = invitedRoomIdsValues[i];

            // Accept/reject invite
            await action(roomId).then(() => {
                // No error, update invited rooms button
                this.removeInvitedRoom(roomId);
            }, async (e) => {
                // Action failure
                if (e.errcode === "M_LIMIT_EXCEEDED") {
                    // Add a delay between each invite change in order to avoid rate
                    // limiting by the server.
                    await sleep(e.retry_after_ms || 2500);

                    // Redo last action
                    i--;
                } else {
                    // Print out error with joining/leaving room
                    logger.warn(e);
                }
            });
        }

        this.setState({
            managingInvites: false,
        });
    };

    private onAcceptAllInvitesClicked = (): void => {
        this.manageInvites(true);
    };

    private onRejectAllInvitesClicked = (): void => {
        this.manageInvites(false);
    };

    private renderIgnoredUsers(): JSX.Element {
        const { waitingUnignored, ignoredUserIds } = this.state;

        const userIds = !ignoredUserIds?.length
            ? _t('You have no ignored users.')
            : ignoredUserIds.map((u) => {
                return (
                    <IgnoredUser
                        userId={u}
                        onUnignored={this.onUserUnignored}
                        key={u}
                        inProgress={waitingUnignored.includes(u)}
                    />
                );
            });

        return (
            <div className='mx_SettingsTab_section'>
                <span className='mx_SettingsTab_subheading'>{ _t('Ignored users') }</span>
                <div className='mx_SettingsTab_subsectionText'>
                    { userIds }
                </div>
            </div>
        );
    }

    private renderManageInvites(): JSX.Element {
        const { invitedRoomIds } = this.state;

        if (invitedRoomIds.size === 0) {
            return null;
        }

        return (
            <div className='mx_SettingsTab_section mx_SecurityUserSettingsTab_bulkOptions'>
                <span className='mx_SettingsTab_subheading'>{ _t('Bulk options') }</span>
                <AccessibleButton onClick={this.onAcceptAllInvitesClicked} kind='primary' disabled={this.state.managingInvites}>
                    { _t("Accept all %(invitedRooms)s invites", { invitedRooms: invitedRoomIds.size }) }
                </AccessibleButton>
                <AccessibleButton onClick={this.onRejectAllInvitesClicked} kind='danger' disabled={this.state.managingInvites}>
                    { _t("Reject all %(invitedRooms)s invites", { invitedRooms: invitedRoomIds.size }) }
                </AccessibleButton>
                { this.state.managingInvites ? <InlineSpinner /> : <div /> }
            </div>
        );
    }

    private onPersonalRuleChanged = (e) => {
        this.setState({ newPersonalRule: e.target.value });
    };

    private onNewListChanged = (e) => {
        this.setState({ newList: e.target.value });
    };

    private onAddPersonalRule = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        let kind = RULE_SERVER;
        if (this.state.newPersonalRule.startsWith("@")) {
            kind = RULE_USER;
        }

        this.setState({ busy: true });
        try {
            const list = await Mjolnir.sharedInstance().getOrCreatePersonalList();
            await list.banEntity(kind, this.state.newPersonalRule, _t("Ignored/Blocked"));
            this.setState({ newPersonalRule: "" }); // this will also cause the new rule to be rendered
        } catch (e) {
            logger.error(e);

            Modal.createTrackedDialog('Failed to add Mjolnir rule', '', ErrorDialog, {
                title: _t('Error adding ignored user/server'),
                description: _t('Something went wrong. Please try again or view your console for hints.'),
            });
        } finally {
            this.setState({ busy: false });
        }
    };

    private onSubscribeList = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        this.setState({ busy: true });
        try {
            const room = await MatrixClientPeg.get().joinRoom(this.state.newList);
            await Mjolnir.sharedInstance().subscribeToList(room.roomId);
            this.setState({ newList: "" }); // this will also cause the new rule to be rendered
        } catch (e) {
            logger.error(e);

            Modal.createTrackedDialog('Failed to subscribe to Mjolnir list', '', ErrorDialog, {
                title: _t('Error subscribing to list'),
                description: _t('Please verify the room ID or address and try again.'),
            });
        } finally {
            this.setState({ busy: false });
        }
    };

    private async removePersonalRule(rule: ListRule) {
        this.setState({ busy: true });
        try {
            const list = Mjolnir.sharedInstance().getPersonalList();
            await list.unbanEntity(rule.kind, rule.entity);
        } catch (e) {
            logger.error(e);

            Modal.createTrackedDialog('Failed to remove Mjolnir rule', '', ErrorDialog, {
                title: _t('Error removing ignored user/server'),
                description: _t('Something went wrong. Please try again or view your console for hints.'),
            });
        } finally {
            this.setState({ busy: false });
        }
    }

    private async unsubscribeFromList(list: BanList) {
        this.setState({ busy: true });
        try {
            await Mjolnir.sharedInstance().unsubscribeFromList(list.roomId);
            await MatrixClientPeg.get().leave(list.roomId);
        } catch (e) {
            logger.error(e);

            Modal.createTrackedDialog('Failed to unsubscribe from Mjolnir list', '', ErrorDialog, {
                title: _t('Error unsubscribing from list'),
                description: _t('Please try again or view your console for hints.'),
            });
        } finally {
            this.setState({ busy: false });
        }
    }

    private viewListRules(list: BanList) {
        const room = MatrixClientPeg.get().getRoom(list.roomId);
        const name = room ? room.name : list.roomId;

        const renderRules = (rules: ListRule[]) => {
            if (rules.length === 0) return <i>{ _t("None") }</i>;

            const tiles = [];
            for (const rule of rules) {
                tiles.push(<li key={rule.kind + rule.entity}><code>{ rule.entity }</code></li>);
            }
            return <ul>{ tiles }</ul>;
        };

        Modal.createTrackedDialog('View Mjolnir list rules', '', QuestionDialog, {
            title: _t("Ban list rules - %(roomName)s", { roomName: name }),
            description: (
                <div>
                    <h3>{ _t("Server rules") }</h3>
                    { renderRules(list.serverRules) }
                    <h3>{ _t("User rules") }</h3>
                    { renderRules(list.userRules) }
                </div>
            ),
            button: _t("Close"),
            hasCancelButton: false,
        });
    }

    private renderPersonalBanListRules() {
        const list = Mjolnir.sharedInstance().getPersonalList();
        const rules = list ? [...list.userRules, ...list.serverRules] : [];
        if (!list || rules.length <= 0) return <i>{ _t("You have not ignored anyone.") }</i>;

        const tiles = [];
        for (const rule of rules) {
            tiles.push(
                <li key={rule.entity} className="mx_MjolnirUserSettingsTab_listItem">
                    <AccessibleButton
                        kind="danger_sm"
                        onClick={() => this.removePersonalRule(rule)}
                        disabled={this.state.busy}
                    >
                        { _t("Remove") }
                    </AccessibleButton>&nbsp;
                    <code>{ rule.entity }</code>
                </li>,
            );
        }

        return (
            <div>
                <p>{ _t("You are currently ignoring:") }</p>
                <ul>{ tiles }</ul>
            </div>
        );
    }

    private renderSubscribedBanLists() {
        const personalList = Mjolnir.sharedInstance().getPersonalList();
        const lists = Mjolnir.sharedInstance().lists.filter(b => {
            return personalList? personalList.roomId !== b.roomId : true;
        });
        if (!lists || lists.length <= 0) return <i>{ _t("You are not subscribed to any lists") }</i>;

        const tiles = [];
        for (const list of lists) {
            const room = MatrixClientPeg.get().getRoom(list.roomId);
            const name = room ? <span>{ room.name } (<code>{ list.roomId }</code>)</span> : <code>list.roomId</code>;
            tiles.push(
                <li key={list.roomId} className="mx_MjolnirUserSettingsTab_listItem">
                    <AccessibleButton
                        kind="danger_sm"
                        onClick={() => this.unsubscribeFromList(list)}
                        disabled={this.state.busy}
                    >
                        { _t("Unsubscribe") }
                    </AccessibleButton>&nbsp;
                    <AccessibleButton
                        kind="primary_sm"
                        onClick={() => this.viewListRules(list)}
                        disabled={this.state.busy}
                    >
                        { _t("View rules") }
                    </AccessibleButton>&nbsp;
                    { name }
                </li>,
            );
        }

        return (
            <div>
                <p>{ _t("You are currently subscribed to:") }</p>
                <ul>{ tiles }</ul>
            </div>
        );
    }

    private async checkTerms(): Promise<void> {
        if (!this.state.haveIdServer) {
            this.setState({ idServerHasUnsignedTerms: false });
            return;
        }

        // By starting the terms flow we get the logic for checking which terms the user has signed
        // for free. So we might as well use that for our own purposes.
        const idServerUrl = MatrixClientPeg.get().getIdentityServerUrl();
        const authClient = new IdentityAuthClient();
        try {
            const idAccessToken = await authClient.getAccessToken({ check: false });
            await startTermsFlow([new Service(
                SERVICE_TYPES.IS,
                idServerUrl,
                idAccessToken,
            )], (policiesAndServices, agreedUrls, extraClassNames) => {
                return new Promise((resolve, reject) => {
                    this.setState({
                        idServerName: abbreviateUrl(idServerUrl),
                        requiredPolicyInfo: {
                            hasTerms: true,
                            policiesAndServices,
                            agreedUrls,
                            resolve,
                        },
                    });
                });
            });
            // User accepted all terms
            this.setState({
                requiredPolicyInfo: {
                    hasTerms: false,
                    ...this.state.requiredPolicyInfo,
                },
            });
        } catch (e) {
            logger.warn(
                `Unable to reach identity server at ${idServerUrl} to check ` +
                `for terms in Settings`,
            );
            logger.warn(e);
        }
    }

    private renderDiscoverySection(): JSX.Element {
        if (this.state.requiredPolicyInfo.hasTerms) {
            const intro = <span className="mx_SettingsTab_subsectionText">
                { _t(
                    "Agree to the identity server (%(serverName)s) Terms of Service to " +
                    "allow yourself to be discoverable by email address or phone number.",
                    { serverName: this.state.idServerName },
                ) }
            </span>;
            return (
                <div>
                    <InlineTermsAgreement
                        policiesAndServicePairs={this.state.requiredPolicyInfo.policiesAndServices}
                        agreedUrls={this.state.requiredPolicyInfo.agreedUrls}
                        onFinished={this.state.requiredPolicyInfo.resolve}
                        introElement={intro}
                    />
                    { /* has its own heading as it includes the current identity server */ }
                    <SetIdServer missingTerms={true} />
                </div>
            );
        }

        const emails = this.state.loading3pids ? <Spinner /> : <DiscoveryEmailAddresses emails={this.state.emails} />;
        const msisdns = this.state.loading3pids ? <Spinner /> : <DiscoveryPhoneNumbers msisdns={this.state.msisdns} />;

        const threepidSection = this.state.haveIdServer ? <div className='mx_GeneralUserSettingsTab_discovery'>
            <span className="mx_SettingsTab_subheading">{ _t("Email addresses") }</span>
            { emails }

            <span className="mx_SettingsTab_subheading">{ _t("Phone numbers") }</span>
            { msisdns }
        </div> : null;

        return (
            <div className="mx_SettingsTab_section">
                { threepidSection }
                { /* has its own heading as it includes the current identity server */ }
                <SetIdServer missingTerms={false} />
            </div>
        );
    }

    render() {
        const brand = SdkConfig.get().brand;

        let analyticsSection;
        if (Analytics.canEnable() || PosthogAnalytics.instance.isEnabled()) {
            const onClickAnalyticsLearnMore = () => {
                if (PosthogAnalytics.instance.isEnabled()) {
                    showAnalyticsLearnMoreDialog({
                        primaryButton: _t("Okay"),
                        hasCancel: false,
                    });
                } else {
                    Analytics.showDetailsModal();
                }
            };
            analyticsSection = <React.Fragment>
                <div className="mx_SettingsTab_heading">{ _t("Analytics") }</div>
                <div className="mx_SettingsTab_section">
                    <p>
                        { _t("Share anonymous data to help us identify issues. Nothing personal. " +
                                "No third parties.") }
                    </p>
                    <p>
                        <AccessibleButton className="mx_SettingsTab_linkBtn" onClick={onClickAnalyticsLearnMore}>
                            { _t("Learn more") }
                        </AccessibleButton>
                    </p>
                    {
                        PosthogAnalytics.instance.isEnabled() ?
                            <SettingsFlag name="pseudonymousAnalyticsOptIn"
                                level={SettingLevel.ACCOUNT}
                                onChange={this.updateAnalytics} /> :
                            <SettingsFlag name="analyticsOptIn"
                                level={SettingLevel.DEVICE}
                                onChange={this.updateAnalytics} />
                    }
                </div>
            </React.Fragment>;
        }

        const ignoreUsersPanel = SettingsStore.getValue(UIFeature.AdvancedSettings) ? this.renderIgnoredUsers() : null;
        const invitesPanel = SettingsStore.getValue(UIFeature.AdvancedSettings) ? this.renderManageInvites() : null;

        const mjolnirSection = this.state.mjolnirEnabled ? this.renderMjolnir(brand) : null;

        const discoWarning = this.state.requiredPolicyInfo.hasTerms
            ? <img
                className='mx_GeneralUserSettingsTab_warningIcon'
                src={require("../../../../../../res/img/feather-customised/warning-triangle.svg").default}
                width="18"
                height="18"
                alt={_t("Warning")}
            />
            : null;

        let discoverySection;
        if (SettingsStore.getValue(UIFeature.IdentityServer)) {
            discoverySection = <>
                <div className="mx_SettingsTab_heading">{ discoWarning } { _t("Discovery") }</div>
                { this.renderDiscoverySection() }
            </>;
        }

        return (
            <div className="mx_SettingsTab mx_MjolnirUserSettingsTab">
                <div className="mx_SettingsTab_heading">{ _t("Privacy") }</div>
                { discoverySection }
                { analyticsSection }
                { ignoreUsersPanel }
                { invitesPanel }
                { mjolnirSection }
            </div>
        );
    }

    renderMjolnir(brand: string) {
        return (
            <div className="mx_SettingsTab mx_MjolnirUserSettingsTab">
                <div className="mx_SettingsTab_heading">{ _t("Ignored users") }</div>
                <div className="mx_SettingsTab_section">
                    <div className='mx_SettingsTab_subsectionText'>
                        <span className='warning'>{ _t("⚠ These settings are meant for advanced users.") }</span><br />
                        <br />
                        { _t(
                            "Add users and servers you want to ignore here. Use asterisks " +
                            "to have %(brand)s match any characters. For example, <code>@bot:*</code> " +
                            "would ignore all users that have the name 'bot' on any server.",
                            { brand }, { code: (s) => <code>{ s }</code> },
                        ) }<br />
                        <br />
                        { _t(
                            "Ignoring people is done through ban lists which contain rules for " +
                            "who to ban. Subscribing to a ban list means the users/servers blocked by " +
                            "that list will be hidden from you.",
                        ) }
                    </div>
                </div>
                <div className="mx_SettingsTab_section">
                    <span className="mx_SettingsTab_subheading">{ _t("Personal ban list") }</span>
                    <div className='mx_SettingsTab_subsectionText'>
                        { _t(
                            "Your personal ban list holds all the users/servers you personally don't " +
                            "want to see messages from. After ignoring your first user/server, a new room " +
                            "will show up in your room list named 'My Ban List' - stay in this room to keep " +
                            "the ban list in effect.",
                        ) }
                    </div>
                    <div>
                        { this.renderPersonalBanListRules() }
                    </div>
                    <div>
                        <form onSubmit={this.onAddPersonalRule} autoComplete="off">
                            <Field
                                type="text"
                                label={_t("Server or user ID to ignore")}
                                placeholder={_t("eg: @bot:* or example.org")}
                                value={this.state.newPersonalRule}
                                onChange={this.onPersonalRuleChanged}
                            />
                            <AccessibleButton
                                type="submit"
                                kind="primary"
                                onClick={this.onAddPersonalRule}
                                disabled={this.state.busy}
                            >
                                { _t("Ignore") }
                            </AccessibleButton>
                        </form>
                    </div>
                </div>
                <div className="mx_SettingsTab_section">
                    <span className="mx_SettingsTab_subheading">{ _t("Subscribed lists") }</span>
                    <div className='mx_SettingsTab_subsectionText'>
                        <span className='warning'>{ _t("Subscribing to a ban list will cause you to join it!") }</span>
                        &nbsp;
                        <span>{ _t(
                            "If this isn't what you want, please use a different tool to ignore users.",
                        ) }</span>
                    </div>
                    <div>
                        { this.renderSubscribedBanLists() }
                    </div>
                    <div>
                        <form onSubmit={this.onSubscribeList} autoComplete="off">
                            <Field
                                type="text"
                                label={_t("Room ID or address of ban list")}
                                value={this.state.newList}
                                onChange={this.onNewListChanged}
                            />
                            <AccessibleButton
                                type="submit"
                                kind="primary"
                                onClick={this.onSubscribeList}
                                disabled={this.state.busy}
                            >
                                { _t("Subscribe") }
                            </AccessibleButton>
                        </form>
                    </div>
                </div>
            </div>
        );
    }
}
