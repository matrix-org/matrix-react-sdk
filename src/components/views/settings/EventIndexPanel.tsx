/*
Copyright 2020-2021 The Matrix.org Foundation C.I.C.

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

import { _t } from '../../../languageHandler';
import SdkConfig from "../../../SdkConfig";
import * as sdk from '../../../index';
import Modal from '../../../Modal';
import SettingsStore from "../../../settings/SettingsStore";
import AccessibleButton from "../elements/AccessibleButton";
import {formatBytes, formatCountLong} from "../../../utils/FormattingUtils";
import EventIndexPeg from "../../../indexing/EventIndexPeg";
import {SettingLevel} from "../../../settings/SettingLevel";
import {replaceableComponent} from "../../../utils/replaceableComponent";
import SeshatResetDialog from '../dialogs/SeshatResetDialog';

interface IState {
    enabling: boolean;
    eventIndexSize: number;
    roomCount: number;
    eventIndexingEnabled: boolean;
}

@replaceableComponent("views.settings.EventIndexPanel")
export default class EventIndexPanel extends React.Component<{}, IState> {
    constructor(props) {
        super(props);

        this.state = {
            enabling: false,
            eventIndexSize: 0,
            roomCount: 0,
            eventIndexingEnabled:
                SettingsStore.getValueAt(SettingLevel.DEVICE, 'enableEventIndexing'),
        };
    }

    updateCurrentRoom = async (room) => {
        const eventIndex = EventIndexPeg.get();
        let stats;

        try {
            stats = await eventIndex.getStats();
        } catch {
            // This call may fail if sporadically, not a huge issue as we will
            // try later again and probably succeed.
            return;
        }

        this.setState({
            eventIndexSize: stats.size,
            roomCount: stats.roomCount,
        });
    };

    componentWillUnmount(): void {
        const eventIndex = EventIndexPeg.get();

        if (eventIndex !== null) {
            eventIndex.removeListener("changedCheckpoint", this.updateCurrentRoom);
        }
    }

    componentDidMount(): void {
        this.updateState();
    }

    async updateState() {
        const eventIndex = EventIndexPeg.get();
        const eventIndexingEnabled = SettingsStore.getValueAt(SettingLevel.DEVICE, 'enableEventIndexing');
        const enabling = false;

        let eventIndexSize = 0;
        let roomCount = 0;

        if (eventIndex !== null) {
            eventIndex.on("changedCheckpoint", this.updateCurrentRoom);

            try {
                const stats = await eventIndex.getStats();
                eventIndexSize = stats.size;
                roomCount = stats.roomCount;
            } catch {
                // This call may fail if sporadically, not a huge issue as we
                // will try later again in the updateCurrentRoom call and
                // probably succeed.
            }
        }

        this.setState({
            enabling,
            eventIndexSize,
            roomCount,
            eventIndexingEnabled,
        });
    }

    private onManage = async () => {
        Modal.createTrackedDialogAsync('Message search', 'Message search',
            // @ts-ignore: TS doesn't seem to like the type of this now that it
            // has also been converted to TS as well, but I can't figure out why...
            import('../../../async-components/views/dialogs/eventindex/ManageEventIndexDialog'),
            {
                onFinished: () => {},
            }, null, /* priority = */ false, /* static = */ true,
        );
    }

    private onEnable = async () => {
        this.setState({
            enabling: true,
        });

        await EventIndexPeg.initEventIndex();
        await EventIndexPeg.get().addInitialCheckpoints();
        await EventIndexPeg.get().startCrawler();
        await SettingsStore.setValue('enableEventIndexing', null, SettingLevel.DEVICE, true);
        await this.updateState();
    }

    private confirmEventStoreReset = () => {
        const { close } = Modal.createDialog(SeshatResetDialog, {
            onFinished: async (success) => {
                if (success) {
                    await SettingsStore.setValue('enableEventIndexing', null, SettingLevel.DEVICE, false);
                    await EventIndexPeg.deleteEventIndex();
                    await this.onEnable();
                    close();
                }
            },
        });
    }

    render() {
        let eventIndexingSettings = null;
        const InlineSpinner = sdk.getComponent('elements.InlineSpinner');
        const brand = SdkConfig.get().brand;

        if (EventIndexPeg.get() !== null) {
            eventIndexingSettings = (
                <div>
                    <div className='mx_SettingsTab_subsectionText'>{_t(
                        "Securely cache encrypted messages locally for them " +
                        "to appear in search results, using %(size)s to store messages from %(rooms)s rooms.",
                        {
                            size: formatBytes(this.state.eventIndexSize, 0),
                            // This drives the singular / plural string
                            // selection for "room" / "rooms" only.
                            count: this.state.roomCount,
                            rooms: formatCountLong(this.state.roomCount),
                        },
                    )}</div>
                    <div>
                        <AccessibleButton kind="primary" onClick={this.onManage}>
                            {_t("Manage")}
                        </AccessibleButton>
                    </div>
                </div>
            );
        } else if (!this.state.eventIndexingEnabled && EventIndexPeg.supportIsInstalled()) {
            eventIndexingSettings = (
                <div>
                    <div className='mx_SettingsTab_subsectionText'>{_t(
                        "Securely cache encrypted messages locally for them to " +
                        "appear in search results.",
                    )}</div>
                    <div>
                        <AccessibleButton kind="primary" disabled={this.state.enabling}
                            onClick={this.onEnable}>
                            {_t("Enable")}
                        </AccessibleButton>
                        {this.state.enabling ? <InlineSpinner /> : <div />}
                    </div>
                </div>
            );
        } else if (EventIndexPeg.platformHasSupport() && !EventIndexPeg.supportIsInstalled()) {
            const nativeLink = (
                "https://github.com/vector-im/element-desktop/blob/develop/" +
                "docs/native-node-modules.md#" +
                "adding-seshat-for-search-in-e2e-encrypted-rooms"
            );

            eventIndexingSettings = (
                <div className='mx_SettingsTab_subsectionText'>{_t(
                    "%(brand)s is missing some components required for securely " +
                    "caching encrypted messages locally. If you'd like to " +
                    "experiment with this feature, build a custom %(brand)s Desktop " +
                    "with <nativeLink>search components added</nativeLink>.",
                    {
                        brand,
                    },
                    {
                        nativeLink: sub => <a href={nativeLink}
                            target="_blank" rel="noreferrer noopener"
                        >{sub}</a>,
                    },
                )}</div>
            );
        } else if (!EventIndexPeg.platformHasSupport()) {
            eventIndexingSettings = (
                <div className='mx_SettingsTab_subsectionText'>{_t(
                    "%(brand)s can't securely cache encrypted messages locally " +
                    "while running in a web browser. Use <desktopLink>%(brand)s Desktop</desktopLink> " +
                    "for encrypted messages to appear in search results.",
                    {
                        brand,
                    },
                    {
                        desktopLink: sub => <a href="https://element.io/get-started"
                            target="_blank" rel="noreferrer noopener"
                        >{sub}</a>,
                    },
                )}</div>
            );
        } else {
            eventIndexingSettings = (
                <div className='mx_SettingsTab_subsectionText'>
                    <p>
                        {this.state.enabling
                            ? <InlineSpinner />
                            : _t("Message search initialisation failed")
                        }
                    </p>
                    {EventIndexPeg.error && (
                        <details>
                            <summary>{_t("Advanced")}</summary>
                            <code>
                                {EventIndexPeg.error.message}
                            </code>
                            <p>
                                <AccessibleButton key="delete" kind="danger" onClick={this.confirmEventStoreReset}>
                                    {_t("Reset")}
                                </AccessibleButton>
                            </p>
                        </details>
                    )}
                </div>
            );
        }

        return eventIndexingSettings;
    }
}
