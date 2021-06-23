/*
Copyright 2015, 2016, 2017, 2020 The Matrix.org Foundation C.I.C.

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
import classNames from 'classnames';
import { lexicographicCompare } from 'matrix-js-sdk/src/utils';
import { Room } from 'matrix-js-sdk/src/models/room'

import { MatrixClientPeg } from "../../../MatrixClientPeg";
import AppsDrawer from './AppsDrawer';
import RateLimitedFunc from '../../../ratelimitedfunc';
import SettingsStore from "../../../settings/SettingsStore";
import AutoHideScrollbar from "../../structures/AutoHideScrollbar";
import { UIFeature } from "../../../settings/UIFeature";
import ResizeNotifier from "../../../utils/ResizeNotifier";
import CallViewForRoom from '../voip/CallViewForRoom';
import { objectHasDiff } from "../../../utils/objects";
import { replaceableComponent } from "../../../utils/replaceableComponent";

interface IProps {
    // js-sdk room object
    room: Room,
    userId: string,
    showApps: boolean, // Render apps

    // maxHeight attribute for the aux panel and the video
    // therein
    maxHeight: number,

    // a callback which is called when the content of the aux panel changes
    // content in a way that is likely to make it change size.
    onResize: () => void,
    fullHeight: boolean,

    resizeNotifier: ResizeNotifier,
}

interface Counter {
    title: string,
    value: number,
    link: string,
    severity: string,
    stateKey: string,
}

interface IState {
    counters: Counter[],
}

@replaceableComponent("views.rooms.AuxPanel")
export default class AuxPanel extends React.Component<IProps, IState> {
    static defaultProps = {
        showApps: true,
    };

    constructor(props) {
        super(props);

        this.state = {
            counters: this.computeCounters(),
        };
    }

    componentDidMount() {
        const cli = MatrixClientPeg.get();
        if (SettingsStore.getValue("feature_state_counters")) {
            cli.on("RoomState.events", this.rateLimitedUpdate);
        }
    }

    componentWillUnmount() {
        const cli = MatrixClientPeg.get();
        if (cli && SettingsStore.getValue("feature_state_counters")) {
            cli.removeListener("RoomState.events", this.rateLimitedUpdate);
        }
    }

    shouldComponentUpdate(nextProps, nextState) {
        return objectHasDiff(this.props, nextProps) || objectHasDiff(this.state, nextState);
    }

    componentDidUpdate(prevProps, prevState) {
        // most changes are likely to cause a resize
        if (this.props.onResize) {
            this.props.onResize();
        }
    }

    private rateLimitedUpdate = new RateLimitedFunc(() => {
        this.setState({ counters: this.computeCounters() });
    }, 500);

    private computeCounters() {
        const counters = [];

        if (this.props.room && SettingsStore.getValue("feature_state_counters")) {
            const stateEvs = this.props.room.currentState.getStateEvents('re.jki.counter');
            stateEvs.sort((a, b) => lexicographicCompare(a.getStateKey(), b.getStateKey()));

            for (const ev of stateEvs) {
                const title = ev.getContent().title;
                const value = ev.getContent().value;
                const link = ev.getContent().link;
                const severity = ev.getContent().severity || "normal";
                const stateKey = ev.getStateKey();

                // We want a non-empty title but can accept falsey values (e.g.
                // zero)
                if (title && value !== undefined) {
                    counters.push({
                        title,
                        value,
                        link,
                        severity,
                        stateKey,
                    })
                }
            }
        }

        return counters;
    }

    render() {
        const callView = (
            <CallViewForRoom
                roomId={this.props.room.roomId}
                maxVideoHeight={this.props.maxHeight}
                resizeNotifier={this.props.resizeNotifier}
            />
        );

        let appsDrawer;
        if (SettingsStore.getValue(UIFeature.Widgets)) {
            appsDrawer = <AppsDrawer
                room={this.props.room}
                userId={this.props.userId}
                maxHeight={this.props.maxHeight}
                showApps={this.props.showApps}
                resizeNotifier={this.props.resizeNotifier}
            />;
        }

        let stateViews = null;
        if (this.state.counters && SettingsStore.getValue("feature_state_counters")) {
            const counters = [];

            this.state.counters.forEach((counter, idx) => {
                const title = counter.title;
                const value = counter.value;
                const link = counter.link;
                const severity = counter.severity;
                const stateKey = counter.stateKey;

                let span = <span>{ title }: { value }</span>;

                if (link) {
                    span = (
                        <a href={link} target="_blank" rel="noreferrer noopener">
                            { span }
                        </a>
                    );
                }

                span = (
                    <span
                        className="m_RoomView_auxPanel_stateViews_span"
                        data-severity={severity}
                        key={ "x-" + stateKey }
                    >
                        {span}
                    </span>
                );

                counters.push(span);
                counters.push(
                    <span
                        className="m_RoomView_auxPanel_stateViews_delim"
                        key={"delim" + idx}
                    > ─ </span>,
                );
            });

            if (counters.length > 0) {
                counters.pop(); // remove last deliminator
                stateViews = (
                    <div className="m_RoomView_auxPanel_stateViews">
                        { counters }
                    </div>
                );
            }
        }

        const classes = classNames({
            "mx_RoomView_auxPanel": true,
            "mx_RoomView_auxPanel_fullHeight": this.props.fullHeight,
        });
        const style: React.CSSProperties = {};
        if (!this.props.fullHeight) {
            style.maxHeight = this.props.maxHeight;
        }

        return (
            <AutoHideScrollbar className={classes} style={style}>
                { stateViews }
                { appsDrawer }
                { callView }
                { this.props.children }
            </AutoHideScrollbar>
        );
    }
}
