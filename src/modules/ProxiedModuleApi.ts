/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

import { ModuleApi } from "@matrix-org/react-sdk-module-api/lib/ModuleApi";
import { TranslationStringsObject } from "@matrix-org/react-sdk-module-api/lib/types/translations";
import { Optional } from "matrix-events-sdk";
import { _t } from "../languageHandler";
import { DialogProps } from "@matrix-org/react-sdk-module-api/lib/components/DialogContent";
import Modal from "../Modal";
import { ModuleUiDialog } from "../components/views/dialogs/ModuleUiDialog";
import React from "react";
import { AccountCredentials } from "@matrix-org/react-sdk-module-api/lib/types/credentials";
import * as Matrix from "matrix-js-sdk/src/matrix";
import SdkConfig from "../SdkConfig";
import PlatformPeg from "../PlatformPeg";
import { doSetLoggedIn } from "../Lifecycle";
import dispatcher from "../dispatcher/dispatcher";

export class ProxiedModuleApi implements ModuleApi {
    private cachedTranslations: Optional<TranslationStringsObject>;

    public get translations(): Optional<TranslationStringsObject> {
        return this.cachedTranslations;
    }

    public registerTranslations(translations: TranslationStringsObject): void {
        this.cachedTranslations = translations;
    }

    public translateString(s: string, variables?: Record<string, unknown>): string {
        return _t(s, variables);
    }

    public openDialog<M extends object, P extends DialogProps = DialogProps, C extends React.Component = React.Component>(title: string, body: (props: P, ref: React.RefObject<C>) => React.ReactNode): Promise<{ didSubmit: boolean, model: M }> {
        return new Promise<{ didSubmit: boolean, model: M }>((resolve) => {
            Modal.createTrackedDialog("ModuleDialog", "", ModuleUiDialog, {
                title: title,
                contentFactory: body,
                contentProps: <DialogProps>{
                    moduleApi: this,
                },
            }, "mx_CompoundDialog").finished.then(([didSubmit, model]) => {
                resolve({ didSubmit, model });
            });
        });
    }

    public async registerAccount(username: string, password: string, displayName?: string): Promise<AccountCredentials> {
        const hsUrl = SdkConfig.get("validated_server_config").hsUrl;
        const client = Matrix.createClient({ baseUrl: hsUrl });
        const req = {
            username,
            password,
            initial_device_display_name: SdkConfig.get("default_device_display_name") || PlatformPeg.get().getDefaultDeviceDisplayName(),
            auth: undefined,
            inhibit_login: false,
        };
        const creds = await (client.registerRequest(req).catch(resp => client.registerRequest({
            ...req,
            auth: {
                session: resp.data.session,
                type: "m.login.dummy",
            },
        })));

        if (displayName) {
            const profileClient = Matrix.createClient({
                baseUrl: hsUrl,
                userId: creds.user_id,
                deviceId: creds.device_id,
                accessToken: creds.access_token,
            });
            await profileClient.setDisplayName(displayName);
        }

        return {
            homeserverUrl: hsUrl,
            userId: creds.user_id,
            deviceId: creds.device_id,
            accessToken: creds.access_token,
        };
    }

    public async useAccount(credentials: AccountCredentials): Promise<void> {
        await doSetLoggedIn({
            ...credentials,
            guest: false,
        }, true);
    }

    public async switchToRoom(roomId: string, andJoin?: boolean): Promise<void> {
        dispatcher.dispatch({
            action: "view_room",
            room_id: roomId,
        });

        if (andJoin) {
            dispatcher.dispatch({
                action: "join_room",
            });
        }
    }
}
