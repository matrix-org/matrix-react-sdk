/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2018 New Vector Ltd
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2020 The Matrix.org Foundation C.I.C.

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

import { logger } from "matrix-js-sdk/src/logger";

import { _td, UserFriendlyError } from "../languageHandler";
import SettingsStore from "../settings/SettingsStore";
import { UIComponent, UIFeature } from "../settings/UIFeature";
import { shouldShowComponent } from "../customisations/helpers/UIComponents";
import { isCurrentLocalRoom, reject, success } from "./utils";
import WidgetUtils from "../utils/WidgetUtils";
import { WidgetType } from "../widgets/WidgetType";
import { Jitsi } from "../widgets/Jitsi";
import { TimelineRenderingType } from "../contexts/RoomContext";
import { Command } from "./command";
import { CommandCategories } from "./interface";

export const addwidget = new Command({
    command: "addwidget",
    args: "<url | embed code | Jitsi url>",
    description: _td("Adds a custom widget by URL to the room"),
    isEnabled: (cli) =>
        SettingsStore.getValue(UIFeature.Widgets) &&
        shouldShowComponent(UIComponent.AddIntegrations) &&
        !isCurrentLocalRoom(cli),
    runFn: function (cli, roomId, threadId, widgetUrl) {
        if (!widgetUrl) {
            return reject(new UserFriendlyError("Please supply a widget URL or embed code"));
        }

        // Try and parse out a widget URL from iframes
        if (widgetUrl.toLowerCase().startsWith("<iframe ")) {
            const embed = new DOMParser().parseFromString(widgetUrl, "text/html").body;
            if (embed?.childNodes?.length === 1) {
                const iframe = embed.firstElementChild;
                if (iframe?.tagName.toLowerCase() === "iframe") {
                    logger.log("Pulling URL out of iframe (embed code)");
                    if (!iframe.hasAttribute("src")) {
                        return reject(new UserFriendlyError("iframe has no src attribute"));
                    }
                    widgetUrl = iframe.getAttribute("src")!;
                }
            }
        }

        if (!widgetUrl.startsWith("https://") && !widgetUrl.startsWith("http://")) {
            return reject(new UserFriendlyError("Please supply a https:// or http:// widget URL"));
        }
        if (WidgetUtils.canUserModifyWidgets(cli, roomId)) {
            const userId = cli.getUserId();
            const nowMs = new Date().getTime();
            const widgetId = encodeURIComponent(`${roomId}_${userId}_${nowMs}`);
            let type = WidgetType.CUSTOM;
            let name = "Custom";
            let data = {};

            // Make the widget a Jitsi widget if it looks like a Jitsi widget
            const jitsiData = Jitsi.getInstance().parsePreferredConferenceUrl(widgetUrl);
            if (jitsiData) {
                logger.log("Making /addwidget widget a Jitsi conference");
                type = WidgetType.JITSI;
                name = "Jitsi";
                data = jitsiData;
                widgetUrl = WidgetUtils.getLocalJitsiWrapperUrl();
            }

            return success(WidgetUtils.setRoomWidget(cli, roomId, widgetId, type, widgetUrl, name, data));
        } else {
            return reject(new UserFriendlyError("You cannot modify widgets in this room."));
        }
    },
    category: CommandCategories.admin,
    renderingTypes: [TimelineRenderingType.Room],
});
