/*
Copyright 2017 Travis Ralston

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

import * as React from "react";
import {_t} from "../../../../languageHandler";
import MatrixClientPeg from "../../../../MatrixClientPeg";
import sdk from "../../../../index";
import Modal from "../../../../Modal";
import SdkConfig from "../../../../SdkConfig";
import PlatformPeg from "../../../../PlatformPeg";
import packageJson from '../../../../../package.json';
import AccessibleButton from "../../../views/elements/AccessibleButton";
import Promise from "bluebird";

// if this looks like a release, use the 'version' from package.json; else use
// the git sha. Prepend version with v, to look like riot-web version
const REACT_SDK_VERSION = 'dist' in packageJson ? packageJson.version : packageJson.gitHead || '<local>';

// Simple method to help prettify GH Release Tags and Commit Hashes.
const semVerRegex = /^v?(\d+\.\d+\.\d+(?:-rc.+)?)(?:-(?:\d+-g)?([0-9a-fA-F]+))?(?:-dirty)?$/i;
const githubVersionLabel = function(repo, token='') {
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

module.exports = React.createClass({
    displayName: 'AboutAppSettingsPanel',

    propTypes: {},

    getInitialState: function() {
        return {
            vectorVersion: undefined,
        };
    },

    componentWillMount: function() {
        if (PlatformPeg.get()) {
            Promise.resolve().then(() => {
                return PlatformPeg.get().getAppVersion();
            }).done((appVersion) => {
                if (this._unmounted) return;
                this.setState({
                    vectorVersion: appVersion,
                });
            }, (e) => {
                console.log("Failed to fetch app version", e);
            });
        }
    },

    onBugReportClicked: function() {
        const BugReportDialog = sdk.getComponent("dialogs.BugReportDialog");
        if (!BugReportDialog) {
            return;
        }
        Modal.createTrackedDialog('Bug Report Dialog', '', BugReportDialog, {});
    },

    onAccessTokenSpoilerClicked: function(event) {
        const target = event.target;
        target.innerHTML = target.getAttribute('data-spoiler');

        const range = document.createRange();
        range.selectNodeContents(target);

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    },

    renderAppInfo: function() {
        let reactSdkVersion = REACT_SDK_VERSION;
        if (reactSdkVersion !== "<local>") {
            reactSdkVersion = githubVersionLabel('matrix-org/matrix-react-sdk', reactSdkVersion);
        }

        let riotWebVersion = "unknown";
        if (this.state && this.state.vectorVersion) {
            riotWebVersion = githubVersionLabel('vector-im/riot-web', this.state.vectorVersion);
        }

        const olmVersion = MatrixClientPeg.get().olmVersion;
        // If the olmVersion is not defined then either crypto is disabled, or
        // we are using an old version of olm. We assume the former.
        let olmVersionString = "<not-enabled>";
        if (olmVersion !== undefined) {
            olmVersionString = `${olmVersion[0]}.${olmVersion[1]}.${olmVersion[2]}`;
        }

        return (
            <div className="mx_AboutAppSettingsPanel_appInfo">
                <div className="mx_AboutAppSettingsPanel_item">
                    { _t("Logged in as:") } { MatrixClientPeg.get().getUserId() }
                </div>

                <div className="mx_AboutAppSettingsPanel_item">
                    { _t("Access token:") }&nbsp;
                    <span className="mx_AboutAppSettingsPanel_accessTokenSpoiler"
                          onClick={this.onAccessTokenSpoilerClicked}
                          data-spoiler={MatrixClientPeg.get().getAccessToken()}>
                        &lt;{ _t("click to reveal") }&gt;
                    </span>
                </div>

                <div className="mx_AboutAppSettingsPanel_item">
                    { _t("Homeserver:") } { MatrixClientPeg.get().getHomeserverUrl() }
                </div>

                <div className="mx_AboutAppSettingsPanel_item">
                    { _t("Identity server:") } { MatrixClientPeg.get().getIdentityServerUrl() }
                </div>

                <div className="mx_AboutAppSettingsPanel_item">
                    { _t("matrix-react-sdk version:") } { reactSdkVersion }
                </div>

                <div className="mx_AboutAppSettingsPanel_item">
                    { _t("riot-web version:") } { riotWebVersion }
                </div>

                <div className="mx_AboutAppSettingsPanel_item">
                    { _t("olm version:") } { olmVersionString }
                </div>
            </div>
        );
    },

    renderActions: function() {
        let bugReport = <div />;
        if (SdkConfig.get().bug_report_endpoint_url) {
            bugReport = (
                <AccessibleButton className="mx_TabbedSettings_button" onClick={this.onBugReportClicked}>
                    { _t('Report a bug') }
                </AccessibleButton>
            );
        }

        let update = <div />;
        const platform = PlatformPeg.get();
        if ('canSelfUpdate' in platform && platform.canSelfUpdate() && 'startUpdateCheck' in platform) {
            update = (
                <AccessibleButton className="mx_TabbedSettings_button" onClick={platform.startUpdateCheck}>
                    { _t('Check for updates') }
                </AccessibleButton>
            );
        }

        return (
            <div className="mx_AboutAppSettingsPanel_actions">
                { bugReport }
                { update }
            </div>
        )
    },

    render: function () {
        return (
            <div className="mx_AboutAppSettingsPanel">
                <h1>{ _t("About") }</h1>

                { this.renderAppInfo() }
                { this.renderActions() }
            </div>
        );
    },
});
