/*
Copyright 2020 - 2021 The Matrix.org Foundation C.I.C.

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

// Primary structures
export * from "./WidgetApi";
export * from "./ClientWidgetApi";
export * from "./Symbols";

// Transports (not sure why you'd use these directly, but might as well export all the things)
export * from "./transport/ITransport";
export * from "./transport/PostmessageTransport";

// Interfaces and simple models
export * from "./interfaces/ICustomWidgetData";
export * from "./interfaces/IJitsiWidgetData";
export * from "./interfaces/IStickerpickerWidgetData";
export * from "./interfaces/IWidget";
export * from "./interfaces/WidgetType";
export * from "./interfaces/IWidgetApiErrorResponse";
export * from "./interfaces/IWidgetApiRequest";
export * from "./interfaces/IWidgetApiResponse";
export * from "./interfaces/WidgetApiAction";
export * from "./interfaces/WidgetApiDirection";
export * from "./interfaces/ApiVersion";
export * from "./interfaces/Capabilities";
export * from "./interfaces/CapabilitiesAction";
export * from "./interfaces/ContentLoadedAction";
export * from "./interfaces/ScreenshotAction";
export * from "./interfaces/StickerAction";
export * from "./interfaces/StickyAction";
export * from "./interfaces/SupportedVersionsAction";
export * from "./interfaces/VisibilityAction";
export * from "./interfaces/GetOpenIDAction";
export * from "./interfaces/OpenIDCredentialsAction";
export * from "./interfaces/WidgetKind";
export * from "./interfaces/ModalButtonKind";
export * from "./interfaces/ModalWidgetActions";
export * from "./interfaces/SetModalButtonEnabledAction";
export * from "./interfaces/WidgetConfigAction";
export * from "./interfaces/SendEventAction";
export * from "./interfaces/ReadEventAction";
export * from "./interfaces/IRoomEvent";
export * from "./interfaces/NavigateAction";

// Complex models
export * from "./models/WidgetEventCapability";
export * from "./models/validation/url";
export * from "./models/validation/utils";
export * from "./models/Widget";
export * from "./models/WidgetParser";

// Utilities
export * from "./templating/url-template";
export * from "./util/SimpleObservable";

// Drivers
export * from "./driver/WidgetDriver";
