/*
 * Copyright 2020 The Matrix.org Foundation C.I.C.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export enum WidgetApiToWidgetAction {
    SupportedApiVersions = "supported_api_versions",
    Capabilities = "capabilities",
    NotifyCapabilities = "notify_capabilities",
    TakeScreenshot = "screenshot",
    UpdateVisibility = "visibility",
    OpenIDCredentials = "openid_credentials",
    WidgetConfig = "widget_config",
    CloseModalWidget = "close_modal",
    ButtonClicked = "button_clicked",
    SendEvent = "send_event",
    SendToDevice = "send_to_device",
    UpdateTurnServers = "update_turn_servers",
}

export enum WidgetApiFromWidgetAction {
    SupportedApiVersions = "supported_api_versions",
    ContentLoaded = "content_loaded",
    SendSticker = "m.sticker",
    UpdateAlwaysOnScreen = "set_always_on_screen",
    GetOpenIDCredentials = "get_openid",
    CloseModalWidget = "close_modal",
    OpenModalWidget = "open_modal",
    SetModalButtonEnabled = "set_button_enabled",
    SendEvent = "send_event",
    SendToDevice = "send_to_device",
    WatchTurnServers = "watch_turn_servers",
    UnwatchTurnServers = "unwatch_turn_servers",

    /**
     * @deprecated It is not recommended to rely on this existing - it can be removed without notice.
     */
    MSC2876ReadEvents = "org.matrix.msc2876.read_events",

    /**
     * @deprecated It is not recommended to rely on this existing - it can be removed without notice.
     */
    MSC2931Navigate = "org.matrix.msc2931.navigate",

    /**
     * @deprecated It is not recommended to rely on this existing - it can be removed without notice.
     */
    MSC2974RenegotiateCapabilities = "org.matrix.msc2974.request_capabilities",
}

export type WidgetApiAction = WidgetApiToWidgetAction | WidgetApiFromWidgetAction | string;
