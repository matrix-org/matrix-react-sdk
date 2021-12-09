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

import React from 'react';
import dis from '../../../dispatcher/dispatcher';
import RightPanelStore from "../../../stores/right-panel/RightPanelStore";
import { RightPanelPhases } from '../../../stores/right-panel/RightPanelStorePhases';
import { IPanelState } from '../../../stores/right-panel/RightPanelStoreIPanelState';
// import type { EventSubscription } from "fbemitter";
import { replaceableComponent } from "../../../utils/replaceableComponent";
import { UPDATE_EVENT } from '../../../stores/AsyncStore';

export enum HeaderKind {
  Room = "room",
  Group = "group",
}

interface IState {
    headerKind: HeaderKind;
    phase: RightPanelPhases;
}

interface IProps {}

@replaceableComponent("views.right_panel.HeaderButtons")
export default abstract class HeaderButtons<P = {}> extends React.Component<IProps & P, IState> {
    private dispatcherRef: string;

    constructor(props: IProps & P, kind: HeaderKind) {
        super(props);

        const rps = RightPanelStore.instance;
        this.state = {
            headerKind: kind,
            phase: rps.currentPanel.phase, //kind === HeaderKind.Room ? rps.visibleRoomPanelPhase : rps.visibleGroupPanelPhase,
        };
    }

    public componentDidMount() {
        RightPanelStore.instance.on(UPDATE_EVENT, this.onRightPanelUpdate.bind(this));
        this.dispatcherRef = dis.register(this.onAction.bind(this)); // used by subclasses
    }

    public componentWillUnmount() {
        RightPanelStore.instance.off(UPDATE_EVENT, this.onRightPanelUpdate.bind(this));
        if (this.dispatcherRef) dis.unregister(this.dispatcherRef);
    }

    protected abstract onAction(payload);

    public setPhase(phase: RightPanelPhases, extras?: Partial<IPanelState>) {
        RightPanelStore.instance.setRightPanel(phase, extras);
    }

    public isPhase(phases: string | string[]) {
        if (Array.isArray(phases)) {
            return phases.includes(this.state.phase);
        } else {
            return phases === this.state.phase;
        }
    }

    private onRightPanelUpdate() {
        this.setState({ phase: RightPanelStore.instance.currentPanel.phase });
        // const rps = RightPanelStore.instance;
        // if (this.state.headerKind === HeaderKind.Room) {
        //     this.setState({ phase: rps.visibleRoomPanelPhase });
        // } else if (this.state.headerKind === HeaderKind.Group) {
        //     this.setState({ phase: rps.visibleGroupPanelPhase });
        // }
    }

    // XXX: Make renderButtons a prop
    public abstract renderButtons(): JSX.Element;

    public render() {
        return <div className="mx_HeaderButtons">
            { this.renderButtons() }
        </div>;
    }
}
