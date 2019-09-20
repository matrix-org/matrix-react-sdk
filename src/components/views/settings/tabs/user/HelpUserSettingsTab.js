/*
Copyright 2019 New Vector Ltd

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
import PropTypes from 'prop-types';
import {_t, getCurrentLanguage} from "../../../../../languageHandler";
import MatrixClientPeg from "../../../../../MatrixClientPeg";
import AccessibleButton from "../../../elements/AccessibleButton";
import SdkConfig from "../../../../../SdkConfig";
import createRoom from "../../../../../createRoom";
const packageJson = require('../../../../../../package.json');
const Modal = require("../../../../../Modal");
const sdk = require("../../../../..");
const PlatformPeg = require("../../../../../PlatformPeg");

// if this looks like a release, use the 'version' from package.json; else use
// the git sha. Prepend version with v, to look like riot-web version
const REACT_SDK_VERSION = packageJson.version;

// Simple method to help prettify GH Release Tags and Commit Hashes.
const semVerRegex = /^v?(\d+\.\d+\.\d+(?:-rc.+)?)(?:-(?:\d+-g)?([0-9a-fA-F]+))?(?:-dirty)?$/i;
const ghVersionLabel = function(repo, token='') {
    const match = token.match(semVerRegex);
    let url;
    if (match && match[1]) { // basic semVer string possibly with commit hash
        url = (match.length > 1 && match[2])
            ? `https://github.com/${repo}/commit/${match[2]}`
            : `https://github.com/${repo}/releases/tag/v${match[1]}`;
    } else {
        url = `https://github.com/${repo}/commit/${token.split('-')[0]}`;
    }
    return <a target="_blank" rel="noopener" href={url}>{ token }</a>;
};

export default class HelpUserSettingsTab extends React.Component {
    static propTypes = {
        closeSettingsFn: PropTypes.func.isRequired,
    };

    constructor() {
        super();

        this.state = {
            vectorVersion: null,
            canUpdate: false,
        };
    }

    componentWillMount(): void {
        PlatformPeg.get().getAppVersion().then((ver) => this.setState({vectorVersion: ver})).catch((e) => {
            console.error("Error getting vector version: ", e);
        });
        PlatformPeg.get().canSelfUpdate().then((v) => this.setState({canUpdate: v})).catch((e) => {
            console.error("Error getting self updatability: ", e);
        });
    }

    _onClearCacheAndReload = (e) => {
        if (!PlatformPeg.get()) return;

        MatrixClientPeg.get().stopClient();
        MatrixClientPeg.get().store.deleteAllData().done(() => {
            PlatformPeg.get().reload();
        });
    };

    _onBugReport = (e) => {
        const BugReportDialog = sdk.getComponent("dialogs.BugReportDialog");
        if (!BugReportDialog) {
            return;
        }
        Modal.createTrackedDialog('Bug Report Dialog', '', BugReportDialog, {});
    };

    _showSpoiler = (event) => {
        const target = event.target;
        target.innerHTML = target.getAttribute('data-spoiler');

        const range = document.createRange();
        range.selectNodeContents(target);

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    };

    _renderLegal() {
        const tocLinks = SdkConfig.get().terms_and_conditions_links;
        if (!tocLinks) return null;

        const legalLinks = [];
        for (const tocEntry of SdkConfig.get().terms_and_conditions_links) {
            legalLinks.push(<div key={tocEntry.url}>
                <a href={tocEntry.url} rel="noreferrer nofollow noopener" target="_blank">{tocEntry.text}</a>
            </div>);
        }

        return (
            <div className='mx_SettingsTab_section mx_HelpUserSettingsTab_versions'>
                <span className='mx_SettingsTab_subheading'>{_t("Legal")}</span>
                <div className='mx_SettingsTab_subsectionText'>
                    {legalLinks}
                </div>
            </div>
        );
    }

    render() {
        let faqText = _t('For help with using Tchap, click <a>here</a>.', {}, {
            'a': (sub) => <a href="https://www.tchap.gouv.fr/faq/" rel='noreferrer nofollow noopener' target='_blank'>{sub}</a>,
        });

        const reactSdkVersion = REACT_SDK_VERSION !== '<local>'
            ? ghVersionLabel('dinsic-pim/matrix-react-sdk', REACT_SDK_VERSION)
            : REACT_SDK_VERSION;
        const vectorVersion = this.state.vectorVersion
            ? ghVersionLabel('dinsic-pim/tchap-web', this.state.vectorVersion)
            : 'unknown';

        let olmVersion = MatrixClientPeg.get().olmVersion;
        olmVersion = olmVersion ? `${olmVersion[0]}.${olmVersion[1]}.${olmVersion[2]}` : '<not-enabled>';

        let updateButton = null;
        if (this.state.canUpdate) {
            const platform = PlatformPeg.get();
            updateButton = (
                <AccessibleButton onClick={platform.startUpdateCheck} kind='primary'>
                    {_t('Check for update')}
                </AccessibleButton>
            );
        }

        return (
            <div className="mx_SettingsTab mx_HelpUserSettingsTab">
                <div className="mx_SettingsTab_heading">{_t("Help & About")}</div>
                <div className="mx_SettingsTab_section">
                    <span className='mx_SettingsTab_subheading'>{_t('Bug reporting')}</span>
                    <div className='mx_SettingsTab_subsectionText'>
                        {
                            _t( "If you've submitted a bug via GitHub, debug logs can help " +
                                "us track down the problem. Debug logs contain application " +
                                "usage data including your username, the IDs or aliases of " +
                                "the rooms or groups you have visited and the usernames of " +
                                "other users. They do not contain messages.",
                            )
                        }
                        <div className='mx_HelpUserSettingsTab_debugButton'>
                            <AccessibleButton onClick={this._onBugReport} kind='primary'>
                                {_t("Submit debug logs")}
                            </AccessibleButton>
                        </div>
                        <div className='mx_HelpUserSettingsTab_debugButton'>
                            <AccessibleButton onClick={this._onClearCacheAndReload} kind='danger'>
                                {_t("Clear Cache and Reload")}
                            </AccessibleButton>
                        </div>
                    </div>
                </div>
                <div className='mx_SettingsTab_section'>
                    <span className='mx_SettingsTab_subheading'>{_t("FAQ")}</span>
                    <div className='mx_SettingsTab_subsectionText'>
                        {faqText}
                    </div>
                </div>
                <div className='mx_SettingsTab_section mx_HelpUserSettingsTab_versions'>
                    <span className='mx_SettingsTab_subheading'>{_t("Versions")}</span>
                    <div className='mx_SettingsTab_subsectionText'>
                        {_t("matrix-react-sdk version:")} {reactSdkVersion}<br />
                        {_t("tchap-web version:")} {vectorVersion}<br />
                        {_t("olm version:")} {olmVersion}<br />
                        {updateButton}
                    </div>
                </div>
                {this._renderLegal()}
                <div className='mx_SettingsTab_section mx_HelpUserSettingsTab_versions'>
                    <span className='mx_SettingsTab_subheading'>{_t("Advanced")}</span>
                    <div className='mx_SettingsTab_subsectionText'>
                        {_t("Homeserver is")} <code>{MatrixClientPeg.get().getHomeserverUrl()}</code><br />
                        {_t("Identity Server is")} <code>{MatrixClientPeg.get().getIdentityServerUrl()}</code><br />
                        {_t("Access Token:") + ' '}
                        <AccessibleButton element="span" onClick={this._showSpoiler}
                                          data-spoiler={MatrixClientPeg.get().getAccessToken()}>
                            &lt;{ _t("click to reveal") }&gt;
                        </AccessibleButton>
                    </div>
                </div>
            </div>
        );
    }
}
