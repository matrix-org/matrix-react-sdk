/*
Copyright 2023 The Matrix.org Foundation C.I.C.

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

import React from "react";

import NewAndImprovedIcon from "../../../../../res/img/element-icons/new-and-improved.svg";
import { useMatrixClientContext } from "../../../../contexts/MatrixClientContext";
import { useNotificationSettings } from "../../../../hooks/useNotificationSettings";
import { useSettingValue } from "../../../../hooks/useSettings";
import { _t } from "../../../../languageHandler";
import {
    DefaultNotificationSettings,
    NotificationSettings,
} from "../../../../models/notificationsettings/NotificationSettings";
import { RoomNotifState } from "../../../../RoomNotifs";
import { SettingLevel } from "../../../../settings/SettingLevel";
import SettingsStore from "../../../../settings/SettingsStore";
import { NotificationColor } from "../../../../stores/notifications/NotificationColor";
import { clearAllNotifications } from "../../../../utils/notifications";
import AccessibleButton from "../../elements/AccessibleButton";
import LabelledCheckbox from "../../elements/LabelledCheckbox";
import LabelledToggleSwitch from "../../elements/LabelledToggleSwitch";
import StyledRadioGroup from "../../elements/StyledRadioGroup";
import TagComposer from "../../elements/TagComposer";
import { StatelessNotificationBadge } from "../../rooms/NotificationBadge/StatelessNotificationBadge";
import { SettingsBanner } from "../shared/SettingsBanner";
import { SettingsSection } from "../shared/SettingsSection";
import SettingsSubsection from "../shared/SettingsSubsection";
import { NotificationPusherSettings } from "./NotificationPusherSettings";

enum NotificationDefaultLevels {
    ALL_MESSAGES = "ALL_MESSAGES",
    PEOPLE_MENTIONS_KEYWORDS = "PEOPLE_MENTIONS_KEYWORDS",
    MENTIONS_KEYWORDS = "MENTIONS_KEYWORDS",
}

function toDefaultLevels(levels: NotificationSettings["defaultLevels"]): NotificationDefaultLevels {
    if (levels.room === RoomNotifState.AllMessages) {
        return NotificationDefaultLevels.ALL_MESSAGES;
    } else if (levels.dm === RoomNotifState.AllMessages) {
        return NotificationDefaultLevels.PEOPLE_MENTIONS_KEYWORDS;
    } else {
        return NotificationDefaultLevels.MENTIONS_KEYWORDS;
    }
}

const NotificationOptions = [
    {
        value: NotificationDefaultLevels.ALL_MESSAGES,
        label: _t("All messages"),
    },
    {
        value: NotificationDefaultLevels.PEOPLE_MENTIONS_KEYWORDS,
        label: _t("People, Mentions and Keywords"),
    },
    {
        value: NotificationDefaultLevels.MENTIONS_KEYWORDS,
        label: _t("Mentions and Keywords only"),
    },
];

function boldText(text: string): JSX.Element {
    return <strong>{text}</strong>;
}

export default function NotificationSettings2(): JSX.Element {
    const cli = useMatrixClientContext();

    const desktopNotifications = useSettingValue<boolean>("notificationsEnabled");
    const desktopShowBody = useSettingValue<boolean>("notificationBodyEnabled");
    const audioNotifications = useSettingValue<boolean>("audioNotificationsEnabled");

    const { model, hasPendingChanges, reconcile } = useNotificationSettings(cli);

    const disabled = model === null || hasPendingChanges;
    const settings = model ?? DefaultNotificationSettings;

    return (
        <div className="mx_NotificationSettings2">
            {hasPendingChanges && (
                <SettingsBanner
                    icon={<img src={NewAndImprovedIcon} alt="" width={12} />}
                    action={_t("Switch now")}
                    onAction={() => reconcile(model)}
                >
                    {_t(
                        "<strong>Update:</strong> We have updated our notification settings. This won’t affect your previously selected settings.",
                        {},
                        { strong: boldText },
                    )}
                </SettingsBanner>
            )}
            <SettingsSection heading={_t("Notifications")}>
                <div className="mx_SettingsSubsection_content mx_NotificationSettings2_flags">
                    <LabelledToggleSwitch
                        label={_t("Enable notifications for this account")}
                        value={!settings.globalMute}
                        disabled={disabled}
                        onChange={(value) =>
                            reconcile({
                                ...model,
                                globalMute: !value,
                            })
                        }
                    />
                    <LabelledToggleSwitch
                        label={_t("Enable desktop notifications for this session")}
                        value={desktopNotifications}
                        onChange={(value) =>
                            SettingsStore.setValue("notificationsEnabled", null, SettingLevel.DEVICE, value)
                        }
                    />
                    <LabelledToggleSwitch
                        label={_t("Show message preview in desktop notification")}
                        value={desktopShowBody}
                        onChange={(value) =>
                            SettingsStore.setValue("notificationBodyEnabled", null, SettingLevel.DEVICE, value)
                        }
                    />
                    <LabelledToggleSwitch
                        label={_t("Enable audible notifications for this session")}
                        value={audioNotifications}
                        onChange={(value) =>
                            SettingsStore.setValue("audioNotificationsEnabled", null, SettingLevel.DEVICE, value)
                        }
                    />
                </div>
                <SettingsSubsection
                    heading={_t("I want to be notified for (Default Setting)")}
                    description={_t("This setting will be applied by default to all your rooms.")}
                >
                    <StyledRadioGroup
                        name="defaultNotificationLevel"
                        value={toDefaultLevels(settings.defaultLevels)}
                        disabled={disabled}
                        definitions={NotificationOptions}
                        onChange={(value) =>
                            reconcile({
                                ...model,
                                defaultLevels: {
                                    ...model.defaultLevels,
                                    dm:
                                        value !== NotificationDefaultLevels.MENTIONS_KEYWORDS
                                            ? RoomNotifState.AllMessages
                                            : RoomNotifState.MentionsOnly,
                                    room:
                                        value === NotificationDefaultLevels.ALL_MESSAGES
                                            ? RoomNotifState.AllMessages
                                            : RoomNotifState.MentionsOnly,
                                },
                            })
                        }
                    />
                </SettingsSubsection>
                <SettingsSubsection
                    heading={_t("Play a sound for")}
                    description={_t("Applied by default to all rooms on all devices.")}
                >
                    <LabelledCheckbox
                        label="People"
                        value={settings.sound.people !== undefined}
                        disabled={disabled}
                        onChange={(value) =>
                            reconcile({
                                ...model,
                                sound: {
                                    ...model.sound,
                                    people: value ? "default" : undefined,
                                },
                            })
                        }
                    />
                    <LabelledCheckbox
                        label={_t("Mentions and Keywords")}
                        value={settings.sound.mentions !== undefined}
                        disabled={disabled}
                        onChange={(value) =>
                            reconcile({
                                ...model,
                                sound: {
                                    ...model.sound,
                                    mentions: value ? "default" : undefined,
                                },
                            })
                        }
                    />
                    <LabelledCheckbox
                        label={_t("Audio and Video calls")}
                        value={settings.sound.calls !== undefined}
                        disabled={disabled}
                        onChange={(value) =>
                            reconcile({
                                ...model,
                                sound: {
                                    ...model.sound,
                                    calls: value ? "ring" : undefined,
                                },
                            })
                        }
                    />
                </SettingsSubsection>
                <SettingsSubsection heading={_t("Other things we think you might be interested in:")}>
                    <LabelledCheckbox
                        label={_t("Invited to a room")}
                        value={settings.activity.invite}
                        disabled={disabled}
                        onChange={(value) =>
                            reconcile({
                                ...model,
                                activity: {
                                    ...model.activity,
                                    invite: value,
                                },
                            })
                        }
                    />
                    <LabelledCheckbox
                        label={_t("New room activity, upgrades and status messages occur")}
                        value={settings.activity.status_event}
                        disabled={disabled}
                        onChange={(value) =>
                            reconcile({
                                ...model,
                                activity: {
                                    ...model.activity,
                                    status_event: value,
                                },
                            })
                        }
                    />
                    <LabelledCheckbox
                        label={_t("Messages are sent by a bot")}
                        value={settings.activity.bot_notices}
                        disabled={disabled}
                        onChange={(value) =>
                            reconcile({
                                ...model,
                                activity: {
                                    ...model.activity,
                                    bot_notices: value,
                                },
                            })
                        }
                    />
                </SettingsSubsection>
                <SettingsSubsection
                    heading={_t("Mentions and Keywords")}
                    description={_t(
                        "Show a badge <badge/> when keywords are used in a room.",
                        {},
                        {
                            badge: <StatelessNotificationBadge symbol="1" count={1} color={NotificationColor.Grey} />,
                        },
                    )}
                >
                    <LabelledCheckbox
                        label={_t("Notify when someone mentions using @room")}
                        value={settings.mentions.room}
                        disabled={disabled}
                        onChange={(value) =>
                            reconcile({
                                ...model,
                                mentions: {
                                    ...model.mentions,
                                    room: value,
                                },
                            })
                        }
                    />
                    <LabelledCheckbox
                        label={_t("Notify when someone mentions using @displayname or @mxid")}
                        value={settings.mentions.user}
                        disabled={disabled}
                        onChange={(value) =>
                            reconcile({
                                ...model,
                                mentions: {
                                    ...model.mentions,
                                    user: value,
                                },
                            })
                        }
                    />
                    <LabelledCheckbox
                        label={_t("Notify when someone uses a keyword")}
                        byline={_t("Enter keywords here, or use for spelling variations or nicknames")}
                        value={settings.mentions.keywords}
                        disabled={disabled}
                        onChange={(value) =>
                            reconcile({
                                ...model,
                                mentions: {
                                    ...model.mentions,
                                    keywords: value,
                                },
                            })
                        }
                    />
                    <TagComposer
                        tags={model?.keywords ?? []}
                        disabled={disabled}
                        onAdd={(keyword) => {
                            reconcile({
                                ...model,
                                keywords: [...model.keywords, keyword],
                            });
                        }}
                        onRemove={(keyword) => {
                            reconcile({
                                ...model,
                                keywords: model.keywords.filter((it) => it !== keyword),
                            });
                        }}
                        label={_t("Keyword")}
                        placeholder={_t("New keyword")}
                    />
                </SettingsSubsection>
                <NotificationPusherSettings />
                <SettingsSubsection heading={_t("Quick Actions")}>
                    <AccessibleButton
                        kind="primary_outline"
                        onClick={async () => {
                            await clearAllNotifications(cli);
                        }}
                    >
                        {_t("Mark all messages as read")}
                    </AccessibleButton>
                    <AccessibleButton kind="danger_outline" onClick={() => reconcile(DefaultNotificationSettings)}>
                        {_t("Reset to default settings")}
                    </AccessibleButton>
                </SettingsSubsection>
            </SettingsSection>
        </div>
    );
}
