/*
Copyright 2019 - 2022 The Matrix.org Foundation C.I.C.

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
import { logger } from "matrix-js-sdk/src/logger";

import AccessibleButton from "../../../elements/AccessibleButton";
import { _t, getCurrentLanguage } from "../../../../../languageHandler";
import { MatrixClientPeg } from "../../../../../MatrixClientPeg";
import SdkConfig from "../../../../../SdkConfig";
import createRoom from "../../../../../createRoom";
import Modal from "../../../../../Modal";
import PlatformPeg from "../../../../../PlatformPeg";
import UpdateCheckButton from "../../UpdateCheckButton";
import BugReportDialog from '../../../dialogs/BugReportDialog';
import { OpenToTabPayload } from "../../../../../dispatcher/payloads/OpenToTabPayload";
import { Action } from "../../../../../dispatcher/actions";
import { UserTab } from "../../../dialogs/UserTab";
import dis from "../../../../../dispatcher/dispatcher";
import CopyableText from "../../../elements/CopyableText";

interface IProps {
    closeSettingsFn: () => void;
}

interface IState {
    appVersion: string;
    canUpdate: boolean;
}

export default class HelpUserSettingsTab extends React.Component<IProps, IState> {
    constructor(props) {
        super(props);

        this.state = {
            appVersion: null,
            canUpdate: false,
        };
    }

    componentDidMount(): void {
        PlatformPeg.get().getAppVersion().then((ver) => this.setState({ appVersion: ver })).catch((e) => {
            logger.error("Error getting vector version: ", e);
        });
        PlatformPeg.get().canSelfUpdate().then((v) => this.setState({ canUpdate: v })).catch((e) => {
            logger.error("Error getting self updatability: ", e);
        });
    }

    private getVersionInfo(): { appVersion: string, olmVersion: string } {
        const brand = SdkConfig.get().brand;
        const appVersion = this.state.appVersion || 'unknown';
        const olmVersionTuple = MatrixClientPeg.get().olmVersion;
        const olmVersion = olmVersionTuple
            ? `${olmVersionTuple[0]}.${olmVersionTuple[1]}.${olmVersionTuple[2]}`
            : '<not-enabled>';

        return {
            appVersion: `${_t("%(brand)s version:", { brand })} ${appVersion}`,
            olmVersion: `${_t("Olm version:")} ${olmVersion}`,
        };
    }

    private onClearCacheAndReload = (e) => {
        if (!PlatformPeg.get()) return;

        // Dev note: please keep this log line, it's useful when troubleshooting a MatrixClient suddenly
        // stopping in the middle of the logs.
        logger.log("Clear cache & reload clicked");
        MatrixClientPeg.get().stopClient();
        MatrixClientPeg.get().store.deleteAllData().then(() => {
            PlatformPeg.get().reload();
        });
    };

    private onBugReport = (e) => {
        Modal.createDialog(BugReportDialog, {});
    };

    private onStartBotChat = (e) => {
        this.props.closeSettingsFn();
        createRoom({
            dmUserId: SdkConfig.get("welcome_user_id"),
            andView: true,
        });
    };

    private renderLegal() {
        const tocLinks = SdkConfig.get().terms_and_conditions_links;
        if (!tocLinks) return null;

        const legalLinks = [];
        for (const tocEntry of tocLinks) {
            legalLinks.push(<div key={tocEntry.url}>
                <a href={tocEntry.url} rel="noreferrer noopener" target="_blank">{ tocEntry.text }</a>
            </div>);
        }

        return (
            <div className='mx_SettingsTab_section'>
                <span className='mx_SettingsTab_subheading'>{ _t("Legal") }</span>
                <div className='mx_SettingsTab_subsectionText'>
                    { legalLinks }
                </div>
            </div>
        );
    }

    private renderCredits() {
        // Note: This is not translated because it is legal text.
        // Also, &nbsp; is ugly but necessary.
        return (
            <div className='mx_SettingsTab_section'>
                <span className='mx_SettingsTab_subheading'>{ _t("Credits") }</span>
                <ul className='mx_SettingsTab_subsectionText'>
                    <li>
                        The <a href="themes/element/img/backgrounds/lake.jpg" rel="noreferrer noopener" target="_blank">
                            default cover photo
                        </a> is ©&nbsp;
                        <a href="https://www.flickr.com/golan" rel="noreferrer noopener" target="_blank">
                            Jesús Roncero
                        </a> used under the terms of&nbsp;
                        <a href="https://creativecommons.org/licenses/by-sa/4.0/" rel="noreferrer noopener" target="_blank">
                            CC-BY-SA 4.0
                        </a>.
                    </li>
                    <li>
                        The <a
                            href="https://github.com/matrix-org/twemoji-colr"
                            rel="noreferrer noopener"
                            target="_blank"
                        >
                            twemoji-colr
                        </a> font is ©&nbsp;
                        <a href="https://mozilla.org" rel="noreferrer noopener" target="_blank">
                            Mozilla Foundation
                        </a> used under the terms of&nbsp;
                        <a href="https://www.apache.org/licenses/LICENSE-2.0" rel="noreferrer noopener" target="_blank">Apache 2.0</a>.
                    </li>
                    <li>
                        The <a href="https://twemoji.twitter.com/" rel="noreferrer noopener" target="_blank">
                            Twemoji
                        </a> emoji art is ©&nbsp;
                        <a href="https://twemoji.twitter.com/" rel="noreferrer noopener" target="_blank">
                            Twitter, Inc and other contributors
                        </a> used under the terms of&nbsp;
                        <a href="https://creativecommons.org/licenses/by/4.0/" rel="noreferrer noopener" target="_blank">
                            CC-BY 4.0
                        </a>.
                    </li>
                </ul>
            </div>
        );
    }

    private getVersionTextToCopy = (): string => {
        const { appVersion, olmVersion } = this.getVersionInfo();
        return `${appVersion}\n${olmVersion}`;
    };

    private onKeyboardShortcutsClicked = (): void => {
        dis.dispatch<OpenToTabPayload>({
            action: Action.ViewUserSettings,
            initialTabId: UserTab.Keyboard,
        });
    };

    render() {
        const brand = SdkConfig.get().brand;

        let faqText = _t(
            'For help with using %(brand)s, click <a>here</a>.',
            {
                brand,
            },
            {
                'a': (sub) => <a
                    href="https://element.io/help"
                    rel="noreferrer noopener"
                    target="_blank"
                >
                    { sub }
                </a>,
            },
        );
        if (SdkConfig.get("welcome_user_id") && getCurrentLanguage().startsWith('en')) {
            faqText = (
                <div>
                    { _t(
                        'For help with using %(brand)s, click <a>here</a> or start a chat with our ' +
                        'bot using the button below.',
                        {
                            brand,
                        },
                        {
                            'a': (sub) => <a
                                href="https://element.io/help"
                                rel='noreferrer noopener'
                                target='_blank'
                            >
                                { sub }
                            </a>,
                        },
                    ) }
                    <div>
                        <AccessibleButton onClick={this.onStartBotChat} kind='primary'>
                            { _t("Chat with %(brand)s Bot", { brand }) }
                        </AccessibleButton>
                    </div>
                </div>
            );
        }

        let updateButton = null;
        if (this.state.canUpdate) {
            updateButton = <UpdateCheckButton />;
        }

        let bugReportingSection;
        if (SdkConfig.get().bug_report_endpoint_url) {
            bugReportingSection = (
                <div className="mx_SettingsTab_section">
                    <span className='mx_SettingsTab_subheading'>{ _t('Bug reporting') }</span>
                    <div className='mx_SettingsTab_subsectionText'>
                        { _t(
                            "If you've submitted a bug via GitHub, debug logs can help " +
                            "us track down the problem. ",
                        ) }
                        { _t("Debug logs contain application " +
                            "usage data including your username, the IDs or aliases of " +
                            "the rooms you have visited, which UI elements you " +
                            "last interacted with, and the usernames of other users. " +
                            "They do not contain messages.",
                        ) }
                    </div>
                    <AccessibleButton onClick={this.onBugReport} kind='primary'>
                        { _t("Submit debug logs") }
                    </AccessibleButton>
                    <div className='mx_SettingsTab_subsectionText'>
                        { _t(
                            "To report a Matrix-related security issue, please read the Matrix.org " +
                            "<a>Security Disclosure Policy</a>.", {},
                            {
                                a: sub => <a href="https://matrix.org/security-disclosure-policy/"
                                    rel="noreferrer noopener"
                                    target="_blank"
                                >{ sub }</a>,
                            },
                        ) }
                    </div>
                </div>
            );
        }

        const { appVersion, olmVersion } = this.getVersionInfo();

        return (
            <div className="mx_SettingsTab mx_HelpUserSettingsTab">
                <div className="mx_SettingsTab_heading">{ _t("Help & About") }</div>
                { bugReportingSection }
                <div className='mx_SettingsTab_section'>
                    <span className='mx_SettingsTab_subheading'>{ _t("FAQ") }</span>
                    <div className='mx_SettingsTab_subsectionText'>
                        { faqText }
                    </div>
                    <AccessibleButton kind="primary" onClick={this.onKeyboardShortcutsClicked}>
                        { _t("Keyboard Shortcuts") }
                    </AccessibleButton>
                </div>
                <div className='mx_SettingsTab_section'>
                    <span className='mx_SettingsTab_subheading'>{ _t("Versions") }</span>
                    <div className='mx_SettingsTab_subsectionText'>
                        <CopyableText getTextToCopy={this.getVersionTextToCopy}>
                            { appVersion }<br />
                            { olmVersion }<br />
                        </CopyableText>
                        { updateButton }
                    </div>
                </div>
                { this.renderLegal() }
                { this.renderCredits() }
                <div className='mx_SettingsTab_section'>
                    <span className='mx_SettingsTab_subheading'>{ _t("Advanced") }</span>
                    <div className='mx_SettingsTab_subsectionText'>
                        <div>{ _t("Homeserver is") } <code>{ MatrixClientPeg.get().getHomeserverUrl() }</code></div>
                        <div>{ _t("Identity server is") } <code>{ MatrixClientPeg.get().getIdentityServerUrl() }</code></div>
                        <details>
                            <summary>{ _t("Access Token") }</summary>
                            <b>{ _t("Your access token gives full access to your account."
                               + " Do not share it with anyone.") }</b>
                            <CopyableText getTextToCopy={() => MatrixClientPeg.get().getAccessToken()}>
                                { MatrixClientPeg.get().getAccessToken() }
                            </CopyableText>
                        </details>
                        <AccessibleButton onClick={this.onClearCacheAndReload} kind='danger'>
                            { _t("Clear cache and reload") }
                        </AccessibleButton>
                    </div>
                </div>
            </div>
        );
    }
}
