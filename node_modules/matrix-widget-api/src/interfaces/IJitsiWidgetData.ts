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

import { IWidgetData } from "./IWidget";

/**
 * Widget data for m.jitsi widgets.
 */
export interface IJitsiWidgetData extends IWidgetData {
    /**
     * The domain where the Jitsi Meet conference is being held.
     */
    domain: string;

    /**
     * The conference ID (also known as the room name) where the conference is being held.
     */
    conferenceId: string;

    /**
     * Optional. True to indicate that the conference should be without video, false
     * otherwise (default).
     */
    isAudioOnly?: boolean;
}
