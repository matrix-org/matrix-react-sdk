/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd
Copyright 2017 New Vector Ltd
Copyright 2018 New Vector Ltd
Copyright 2019 The Matrix.org Foundation C.I.C.

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

import dis from "../../../dispatcher/dispatcher";
import RightPanelStore from "../../../stores/right-panel/RightPanelStore";
import { RightPanelPhases } from "../../../stores/right-panel/RightPanelStorePhases";
import { UPDATE_EVENT } from "../../../stores/AsyncStore";
import { NotificationColor } from "../../../stores/notifications/NotificationColor";
import SettingsStore from "../../../settings/SettingsStore";

export enum HeaderKind {
    Room = "room",
}

interface IState {
    headerKind: HeaderKind;
    phase: RightPanelPhases | null;
    threadNotificationColor: NotificationColor;
    globalNotificationColor: NotificationColor;
    notificationsEnabled?: boolean;
}

interface IProps {}

export default abstract class HeaderButtons<P = {}> extends React.Component<IProps & P, IState> {
    private unmounted = false;
    private dispatcherRef?: string = undefined;
    private readonly watcherRef: string;

    public constructor(props: IProps & P, kind: HeaderKind) {
        super(props);

        const rps = RightPanelStore.instance;
        this.state = {
            headerKind: kind,
            phase: rps.currentCard.phase,
            threadNotificationColor: NotificationColor.None,
            globalNotificationColor: NotificationColor.None,
            notificationsEnabled: SettingsStore.getValue("feature_notifications"),
        };
        this.watcherRef = SettingsStore.watchSetting("feature_notifications", null, (...[, , , value]) =>
            this.setState({ notificationsEnabled: value }),
        );
    }

    public componentDidMount(): void {
        RightPanelStore.instance.on(UPDATE_EVENT, this.onRightPanelStoreUpdate);
    }

    public componentWillUnmount(): void {
        this.unmounted = true;
        RightPanelStore.instance.off(UPDATE_EVENT, this.onRightPanelStoreUpdate);
        if (this.dispatcherRef) dis.unregister(this.dispatcherRef);
        if (this.watcherRef) SettingsStore.unwatchSetting(this.watcherRef);
    }

    public isPhase(phases: string | string[]): boolean {
        if (!RightPanelStore.instance.isOpen) return false;
        if (Array.isArray(phases)) {
            return !!this.state.phase && phases.includes(this.state.phase);
        } else {
            return phases === this.state.phase;
        }
    }

    private onRightPanelStoreUpdate = (): void => {
        if (this.unmounted) return;
        this.setState({ phase: RightPanelStore.instance.currentCard.phase });
    };

    // XXX: Make renderButtons a prop
    public abstract renderButtons(): JSX.Element;

    public render(): React.ReactNode {
        return this.renderButtons();
    }
}
