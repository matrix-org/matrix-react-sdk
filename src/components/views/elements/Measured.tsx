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

import React, { createRef } from "react";

import RoomContext from "../../../contexts/RoomContext";
import UIStore, { UI_EVENTS } from "../../../stores/UIStore";

const NARROW_BREAKPOINT = 500;

interface IState {
    narrow: boolean;
}

export default class Measured extends React.Component<{}, IState> {
    static contextType = RoomContext;

    private static instanceCount = 0;
    private readonly instanceId: number;

    private sensor = createRef<HTMLDivElement>();

    constructor(props, context) {
        super(props, context);

        this.instanceId = Measured.instanceCount++;

        this.state = {
            narrow: false,
        };
    }

    componentDidMount() {
        UIStore.instance.on(`Measured${this.instanceId}`, this.onResize);
        UIStore.instance.trackElementDimensions(`Measured${this.instanceId}`,
            this.sensor.current);
    }

    componentWillUnmount() {
        UIStore.instance.off(`Measured${this.instanceId}`, this.onResize);
        UIStore.instance.stopTrackingElementDimensions(`Measured${this.instanceId}`);
    }

    private onResize = (type: UI_EVENTS, entry: ResizeObserverEntry) => {
        if (type !== UI_EVENTS.Resize) return;
        this.setState({
            narrow: entry.contentRect.width <= NARROW_BREAKPOINT,
        });
    };

    render() {
        return <RoomContext.Provider value={{
            ...this.context,
            narrow: this.state.narrow,
        }}>
            { this.props.children }
            <div className="mx_Measured_sensor" ref={this.sensor} />
        </RoomContext.Provider>;
    }
}
