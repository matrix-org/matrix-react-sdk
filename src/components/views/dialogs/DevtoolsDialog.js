/*
Copyright 2017 Michael Telatynski <7t3chguy@gmail.com>

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

import React, {useState, useEffect} from 'react';
import PropTypes from 'prop-types';
import * as sdk from '../../../index';
import SyntaxHighlight from '../elements/SyntaxHighlight';
import { _t } from '../../../languageHandler';
import Field from "../elements/Field";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import {useEventEmitter} from "../../../hooks/useEventEmitter";

import {
    PHASE_UNSENT,
    PHASE_REQUESTED,
    PHASE_READY,
    PHASE_DONE,
    PHASE_STARTED,
    PHASE_CANCELLED,
} from "matrix-js-sdk/src/crypto/verification/request/VerificationRequest";
import WidgetStore from "../../../stores/WidgetStore";
import {UPDATE_EVENT} from "../../../stores/AsyncStore";
import {SETTINGS} from "../../../settings/Settings";
import SettingsStore, {LEVEL_ORDER} from "../../../settings/SettingsStore";
import Modal from "../../../Modal";
import ErrorDialog from "./ErrorDialog";
import {replaceableComponent} from "../../../utils/replaceableComponent";
import {Room} from "matrix-js-sdk/src/models/room";
import {MatrixEvent} from "matrix-js-sdk/src/models/event";

class GenericEditor extends React.PureComponent {
    // static propTypes = {onBack: PropTypes.func.isRequired};

    constructor(props) {
        super(props);
        this._onChange = this._onChange.bind(this);
        this.onBack = this.onBack.bind(this);
    }

    onBack() {
        if (this.state.message) {
            this.setState({ message: null });
        } else {
            this.props.onBack();
        }
    }

    _onChange(e) {
        this.setState({[e.target.id]: e.target.type === 'checkbox' ? e.target.checked : e.target.value});
    }

    _buttons() {
        return <div className="mx_Dialog_buttons">
            <button onClick={this.onBack}>{ _t('Back') }</button>
            { !this.state.message && <button onClick={this._send}>{ _t('Send') }</button> }
        </div>;
    }

    textInput(id, label) {
        return <Field
            id={id}
            label={label}
            size="42"
            autoFocus={true}
            type="text"
            autoComplete="on"
            value={this.state[id]}
            onChange={this._onChange}
        />;
    }
}

export class SendCustomEvent extends GenericEditor {
    static getLabel() { return _t('Send Custom Event'); }

    static propTypes = {
        onBack: PropTypes.func.isRequired,
        room: PropTypes.instanceOf(Room).isRequired,
        forceStateEvent: PropTypes.bool,
        forceGeneralEvent: PropTypes.bool,
        inputs: PropTypes.object,
    };

    static contextType = MatrixClientContext;

    constructor(props) {
        super(props);
        this._send = this._send.bind(this);

        const {eventType, stateKey, evContent} = Object.assign({
            eventType: '',
            stateKey: '',
            evContent: '{\n\n}',
        }, this.props.inputs);

        this.state = {
            isStateEvent: Boolean(this.props.forceStateEvent),

            eventType,
            stateKey,
            evContent,
        };
    }

    send(content) {
        const cli = this.context;
        if (this.state.isStateEvent) {
            return cli.sendStateEvent(this.props.room.roomId, this.state.eventType, content, this.state.stateKey);
        } else {
            return cli.sendEvent(this.props.room.roomId, this.state.eventType, content);
        }
    }

    async _send() {
        if (this.state.eventType === '') {
            this.setState({ message: _t('You must specify an event type!') });
            return;
        }

        let message;
        try {
            const content = JSON.parse(this.state.evContent);
            await this.send(content);
            message = _t('Event sent!');
        } catch (e) {
            message = _t('Failed to send custom event.') + ' (' + e.toString() + ')';
        }
        this.setState({ message });
    }

    render() {
        if (this.state.message) {
            return <div>
                <div className="mx_Dialog_content">
                    { this.state.message }
                </div>
                { this._buttons() }
            </div>;
        }

        const showTglFlip = !this.state.message && !this.props.forceStateEvent && !this.props.forceGeneralEvent;

        return <div>
            <div className="mx_DevTools_content">
                <div className="mx_DevTools_eventTypeStateKeyGroup">
                    { this.textInput('eventType', _t('Event Type')) }
                    { this.state.isStateEvent && this.textInput('stateKey', _t('State Key')) }
                </div>

                <br />

                <Field id="evContent" label={_t("Event Content")} type="text" className="mx_DevTools_textarea"
                    autoComplete="off" value={this.state.evContent} onChange={this._onChange} element="textarea" />
            </div>
            <div className="mx_Dialog_buttons">
                <button onClick={this.onBack}>{ _t('Back') }</button>
                { !this.state.message && <button onClick={this._send}>{ _t('Send') }</button> }
                { showTglFlip && <div style={{float: "right"}}>
                    <input id="isStateEvent" className="mx_DevTools_tgl mx_DevTools_tgl-flip" type="checkbox" onChange={this._onChange} checked={this.state.isStateEvent} />
                    <label className="mx_DevTools_tgl-btn" data-tg-off="Event" data-tg-on="State Event" htmlFor="isStateEvent" />
                </div> }
            </div>
        </div>;
    }
}

class SendAccountData extends GenericEditor {
    static getLabel() { return _t('Send Account Data'); }

    static propTypes = {
        room: PropTypes.instanceOf(Room).isRequired,
        isRoomAccountData: PropTypes.bool,
        forceMode: PropTypes.bool,
        inputs: PropTypes.object,
    };

    static contextType = MatrixClientContext;

    constructor(props) {
        super(props);
        this._send = this._send.bind(this);

        const {eventType, evContent} = Object.assign({
            eventType: '',
            evContent: '{\n\n}',
        }, this.props.inputs);

        this.state = {
            isRoomAccountData: Boolean(this.props.isRoomAccountData),

            eventType,
            evContent,
        };
    }

    send(content) {
        const cli = this.context;
        if (this.state.isRoomAccountData) {
            return cli.setRoomAccountData(this.props.room.roomId, this.state.eventType, content);
        }
        return cli.setAccountData(this.state.eventType, content);
    }

    async _send() {
        if (this.state.eventType === '') {
            this.setState({ message: _t('You must specify an event type!') });
            return;
        }

        let message;
        try {
            const content = JSON.parse(this.state.evContent);
            await this.send(content);
            message = _t('Event sent!');
        } catch (e) {
            message = _t('Failed to send custom event.') + ' (' + e.toString() + ')';
        }
        this.setState({ message });
    }

    render() {
        if (this.state.message) {
            return <div>
                <div className="mx_Dialog_content">
                    { this.state.message }
                </div>
                { this._buttons() }
            </div>;
        }

        return <div>
            <div className="mx_DevTools_content">
                { this.textInput('eventType', _t('Event Type')) }
                <br />

                <Field id="evContent" label={_t("Event Content")} type="text" className="mx_DevTools_textarea"
                    autoComplete="off" value={this.state.evContent} onChange={this._onChange} element="textarea" />
            </div>
            <div className="mx_Dialog_buttons">
                <button onClick={this.onBack}>{ _t('Back') }</button>
                { !this.state.message && <button onClick={this._send}>{ _t('Send') }</button> }
                { !this.state.message && <div style={{float: "right"}}>
                    <input id="isRoomAccountData" className="mx_DevTools_tgl mx_DevTools_tgl-flip" type="checkbox" onChange={this._onChange} checked={this.state.isRoomAccountData} disabled={this.props.forceMode} />
                    <label className="mx_DevTools_tgl-btn" data-tg-off="Account Data" data-tg-on="Room Data" htmlFor="isRoomAccountData" />
                </div> }
            </div>
        </div>;
    }
}

const INITIAL_LOAD_TILES = 20;
const LOAD_TILES_STEP_SIZE = 50;

class FilteredList extends React.PureComponent {
    static propTypes = {
        children: PropTypes.any,
        query: PropTypes.string,
        onChange: PropTypes.func,
    };

    static filterChildren(children, query) {
        if (!query) return children;
        const lcQuery = query.toLowerCase();
        return children.filter((child) => child.key.toLowerCase().includes(lcQuery));
    }

    constructor(props) {
        super(props);

        this.state = {
            filteredChildren: FilteredList.filterChildren(this.props.children, this.props.query),
            truncateAt: INITIAL_LOAD_TILES,
        };
    }

    // TODO: [REACT-WARNING] Replace with appropriate lifecycle event
    UNSAFE_componentWillReceiveProps(nextProps) { // eslint-disable-line camelcase
        if (this.props.children === nextProps.children && this.props.query === nextProps.query) return;
        this.setState({
            filteredChildren: FilteredList.filterChildren(nextProps.children, nextProps.query),
            truncateAt: INITIAL_LOAD_TILES,
        });
    }

    showAll = () => {
        this.setState({
            truncateAt: this.state.truncateAt + LOAD_TILES_STEP_SIZE,
        });
    };

    createOverflowElement = (overflowCount: number, totalCount: number) => {
        return <button className="mx_DevTools_RoomStateExplorer_button" onClick={this.showAll}>
            { _t("and %(count)s others...", { count: overflowCount }) }
        </button>;
    };

    onQuery = (ev) => {
        if (this.props.onChange) this.props.onChange(ev.target.value);
    };

    getChildren = (start: number, end: number) => {
        return this.state.filteredChildren.slice(start, end);
    };

    getChildCount = (): number => {
        return this.state.filteredChildren.length;
    };

    render() {
        const TruncatedList = sdk.getComponent("elements.TruncatedList");
        return <div>
            <Field label={_t('Filter results')} autoFocus={true} size={64}
                type="text" autoComplete="off" value={this.props.query} onChange={this.onQuery}
                className="mx_TextInputDialog_input mx_DevTools_RoomStateExplorer_query"
                // force re-render so that autoFocus is applied when this component is re-used
                key={this.props.children[0] ? this.props.children[0].key : ''} />

            <TruncatedList getChildren={this.getChildren}
                getChildCount={this.getChildCount}
                truncateAt={this.state.truncateAt}
                createOverflowElement={this.createOverflowElement} />
        </div>;
    }
}

class RoomStateExplorer extends React.PureComponent {
    static getLabel() { return _t('Explore Room State'); }

    static propTypes = {
        onBack: PropTypes.func.isRequired,
        room: PropTypes.instanceOf(Room).isRequired,
    };

    static contextType = MatrixClientContext;

    roomStateEvents: Map<string, Map<string, MatrixEvent>>;

    constructor(props) {
        super(props);

        this.roomStateEvents = this.props.room.currentState.events;

        this.onBack = this.onBack.bind(this);
        this.editEv = this.editEv.bind(this);
        this.onQueryEventType = this.onQueryEventType.bind(this);
        this.onQueryStateKey = this.onQueryStateKey.bind(this);

        this.state = {
            eventType: null,
            event: null,
            editing: false,

            queryEventType: '',
            queryStateKey: '',
        };
    }

    browseEventType(eventType) {
        return () => {
            this.setState({ eventType });
        };
    }

    onViewSourceClick(event) {
        return () => {
            this.setState({ event });
        };
    }

    onBack() {
        if (this.state.editing) {
            this.setState({ editing: false });
        } else if (this.state.event) {
            this.setState({ event: null });
        } else if (this.state.eventType) {
            this.setState({ eventType: null });
        } else {
            this.props.onBack();
        }
    }

    editEv() {
        this.setState({ editing: true });
    }

    onQueryEventType(filterEventType) {
        this.setState({ queryEventType: filterEventType });
    }

    onQueryStateKey(filterStateKey) {
        this.setState({ queryStateKey: filterStateKey });
    }

    render() {
        if (this.state.event) {
            if (this.state.editing) {
                return <SendCustomEvent room={this.props.room} forceStateEvent={true} onBack={this.onBack} inputs={{
                    eventType: this.state.event.getType(),
                    evContent: JSON.stringify(this.state.event.getContent(), null, '\t'),
                    stateKey: this.state.event.getStateKey(),
                }} />;
            }

            return <div className="mx_ViewSource">
                <div className="mx_Dialog_content">
                    <SyntaxHighlight className="json">
                        { JSON.stringify(this.state.event.event, null, 2) }
                    </SyntaxHighlight>
                </div>
                <div className="mx_Dialog_buttons">
                    <button onClick={this.onBack}>{ _t('Back') }</button>
                    <button onClick={this.editEv}>{ _t('Edit') }</button>
                </div>
            </div>;
        }

        let list = null;

        const classes = 'mx_DevTools_RoomStateExplorer_button';
        if (this.state.eventType === null) {
            list = <FilteredList query={this.state.queryEventType} onChange={this.onQueryEventType}>
                {
                    Array.from(this.roomStateEvents.entries()).map(([eventType, allStateKeys]) => {
                        let onClickFn;
                        if (allStateKeys.size === 1 && allStateKeys.has("")) {
                            onClickFn = this.onViewSourceClick(allStateKeys.get(""));
                        } else {
                            onClickFn = this.browseEventType(eventType);
                        }

                        return <button className={classes} key={eventType} onClick={onClickFn}>
                            {eventType}
                        </button>;
                    })
                }
            </FilteredList>;
        } else {
            const stateGroup = this.roomStateEvents.get(this.state.eventType);

            list = <FilteredList query={this.state.queryStateKey} onChange={this.onQueryStateKey}>
                {
                    Array.from(stateGroup.entries()).map(([stateKey, ev]) => {
                        return <button className={classes} key={stateKey} onClick={this.onViewSourceClick(ev)}>
                            { stateKey }
                        </button>;
                    })
                }
            </FilteredList>;
        }

        return <div>
            <div className="mx_Dialog_content">
                { list }
            </div>
            <div className="mx_Dialog_buttons">
                <button onClick={this.onBack}>{ _t('Back') }</button>
            </div>
        </div>;
    }
}

class AccountDataExplorer extends React.PureComponent {
    static getLabel() { return _t('Explore Account Data'); }

    static propTypes = {
        onBack: PropTypes.func.isRequired,
        room: PropTypes.instanceOf(Room).isRequired,
    };

    static contextType = MatrixClientContext;

    constructor(props) {
        super(props);

        this.onBack = this.onBack.bind(this);
        this.editEv = this.editEv.bind(this);
        this._onChange = this._onChange.bind(this);
        this.onQueryEventType = this.onQueryEventType.bind(this);

        this.state = {
            isRoomAccountData: false,
            event: null,
            editing: false,

            queryEventType: '',
        };
    }

    getData() {
        if (this.state.isRoomAccountData) {
            return this.props.room.accountData;
        }
        return this.context.store.accountData;
    }

    onViewSourceClick(event) {
        return () => {
            this.setState({ event });
        };
    }

    onBack() {
        if (this.state.editing) {
            this.setState({ editing: false });
        } else if (this.state.event) {
            this.setState({ event: null });
        } else {
            this.props.onBack();
        }
    }

    _onChange(e) {
        this.setState({[e.target.id]: e.target.type === 'checkbox' ? e.target.checked : e.target.value});
    }

    editEv() {
        this.setState({ editing: true });
    }

    onQueryEventType(queryEventType) {
        this.setState({ queryEventType });
    }

    render() {
        if (this.state.event) {
            if (this.state.editing) {
                return <SendAccountData
                    room={this.props.room}
                    isRoomAccountData={this.state.isRoomAccountData}
                    onBack={this.onBack}
                    inputs={{
                        eventType: this.state.event.getType(),
                        evContent: JSON.stringify(this.state.event.getContent(), null, '\t'),
                    }} forceMode={true} />;
            }

            return <div className="mx_ViewSource">
                <div className="mx_DevTools_content">
                    <SyntaxHighlight className="json">
                        { JSON.stringify(this.state.event.event, null, 2) }
                    </SyntaxHighlight>
                </div>
                <div className="mx_Dialog_buttons">
                    <button onClick={this.onBack}>{ _t('Back') }</button>
                    <button onClick={this.editEv}>{ _t('Edit') }</button>
                </div>
            </div>;
        }

        const rows = [];

        const classes = 'mx_DevTools_RoomStateExplorer_button';

        const data = this.getData();
        Object.keys(data).forEach((evType) => {
            const ev = data[evType];
            rows.push(<button className={classes} key={evType} onClick={this.onViewSourceClick(ev)}>
                { evType }
            </button>);
        });

        return <div>
            <div className="mx_Dialog_content">
                <FilteredList query={this.state.queryEventType} onChange={this.onQueryEventType}>
                    { rows }
                </FilteredList>
            </div>
            <div className="mx_Dialog_buttons">
                <button onClick={this.onBack}>{ _t('Back') }</button>
                { !this.state.message && <div style={{float: "right"}}>
                    <input id="isRoomAccountData" className="mx_DevTools_tgl mx_DevTools_tgl-flip" type="checkbox" onChange={this._onChange} checked={this.state.isRoomAccountData} />
                    <label className="mx_DevTools_tgl-btn" data-tg-off="Account Data" data-tg-on="Room Data" htmlFor="isRoomAccountData" />
                </div> }
            </div>
        </div>;
    }
}

class ServersInRoomList extends React.PureComponent {
    static getLabel() { return _t('View Servers in Room'); }

    static propTypes = {
        onBack: PropTypes.func.isRequired,
        room: PropTypes.instanceOf(Room).isRequired,
    };

    static contextType = MatrixClientContext;

    constructor(props) {
        super(props);

        const room = this.props.room;
        const servers = new Set();
        room.currentState.getStateEvents("m.room.member").forEach(ev => servers.add(ev.getSender().split(":")[1]));
        this.servers = Array.from(servers).map(s =>
            <button key={s} className="mx_DevTools_ServersInRoomList_button">
                { s }
            </button>);

        this.state = {
            query: '',
        };
    }

    onQuery = (query) => {
        this.setState({ query });
    }

    render() {
        return <div>
            <div className="mx_Dialog_content">
                <FilteredList query={this.state.query} onChange={this.onQuery}>
                    { this.servers }
                </FilteredList>
            </div>
            <div className="mx_Dialog_buttons">
                <button onClick={this.props.onBack}>{ _t('Back') }</button>
            </div>
        </div>;
    }
}

const PHASE_MAP = {
    [PHASE_UNSENT]: "unsent",
    [PHASE_REQUESTED]: "requested",
    [PHASE_READY]: "ready",
    [PHASE_DONE]: "done",
    [PHASE_STARTED]: "started",
    [PHASE_CANCELLED]: "cancelled",
};

function VerificationRequest({txnId, request}) {
    const [, updateState] = useState();
    const [timeout, setRequestTimeout] = useState(request.timeout);

    /* Re-render if something changes state */
    useEventEmitter(request, "change", updateState);

    /* Keep re-rendering if there's a timeout */
    useEffect(() => {
        if (request.timeout == 0) return;

        /* Note that request.timeout is a getter, so its value changes */
        const id = setInterval(() => {
            setRequestTimeout(request.timeout);
        }, 500);

        return () => { clearInterval(id); };
    }, [request]);

    return (<div className="mx_DevTools_VerificationRequest">
        <dl>
            <dt>Transaction</dt>
            <dd>{txnId}</dd>
            <dt>Phase</dt>
            <dd>{PHASE_MAP[request.phase] || request.phase}</dd>
            <dt>Timeout</dt>
            <dd>{Math.floor(timeout / 1000)}</dd>
            <dt>Methods</dt>
            <dd>{request.methods && request.methods.join(", ")}</dd>
            <dt>requestingUserId</dt>
            <dd>{request.requestingUserId}</dd>
            <dt>observeOnly</dt>
            <dd>{JSON.stringify(request.observeOnly)}</dd>
        </dl>
    </div>);
}

class VerificationExplorer extends React.Component {
    static getLabel() {
        return _t("Verification Requests");
    }

    /* Ensure this.context is the cli */
    static contextType = MatrixClientContext;

    onNewRequest = () => {
        this.forceUpdate();
    }

    componentDidMount() {
        const cli = this.context;
        cli.on("crypto.verification.request", this.onNewRequest);
    }

    componentWillUnmount() {
        const cli = this.context;
        cli.off("crypto.verification.request", this.onNewRequest);
    }

    render() {
        const cli = this.context;
        const room = this.props.room;
        const inRoomChannel = cli._crypto._inRoomVerificationRequests;
        const inRoomRequests = (inRoomChannel._requestsByRoomId || new Map()).get(room.roomId) || new Map();

        return (<div>
            <div className="mx_Dialog_content">
                {Array.from(inRoomRequests.entries()).reverse().map(([txnId, request]) =>
                    <VerificationRequest txnId={txnId} request={request} key={txnId} />,
                )}
            </div>
            <div className="mx_Dialog_buttons">
                <button onClick={this.props.onBack}>{_t("Back")}</button>
            </div>
        </div>);
    }
}

class WidgetExplorer extends React.Component {
    static getLabel() {
        return _t("Active Widgets");
    }

    constructor(props) {
        super(props);

        this.state = {
            query: '',
            editWidget: null, // set to an IApp when editing
        };
    }

    onWidgetStoreUpdate = () => {
        this.forceUpdate();
    };

    onQueryChange = (query) => {
        this.setState({query});
    };

    onEditWidget = (widget) => {
        this.setState({editWidget: widget});
    };

    onBack = () => {
        const widgets = WidgetStore.instance.getApps(this.props.room.roomId);
        if (this.state.editWidget && widgets.includes(this.state.editWidget)) {
            this.setState({editWidget: null});
        } else {
            this.props.onBack();
        }
    };

    componentDidMount() {
        WidgetStore.instance.on(UPDATE_EVENT, this.onWidgetStoreUpdate);
    }

    componentWillUnmount() {
        WidgetStore.instance.off(UPDATE_EVENT, this.onWidgetStoreUpdate);
    }

    render() {
        const room = this.props.room;

        const editWidget = this.state.editWidget;
        const widgets = WidgetStore.instance.getApps(room.roomId);
        if (editWidget && widgets.includes(editWidget)) {
            const allState = Array.from(Array.from(room.currentState.events.values()).map(e => e.values()))
                .reduce((p, c) => {p.push(...c); return p;}, []);
            const stateEv = allState.find(ev => ev.getId() === editWidget.eventId);
            if (!stateEv) { // "should never happen"
                return <div>
                    {_t("There was an error finding this widget.")}
                    <div className="mx_Dialog_buttons">
                        <button onClick={this.onBack}>{_t("Back")}</button>
                    </div>
                </div>;
            }
            return <SendCustomEvent
                onBack={this.onBack}
                room={room}
                forceStateEvent={true}
                inputs={{
                    eventType: stateEv.getType(),
                    evContent: JSON.stringify(stateEv.getContent(), null, '\t'),
                    stateKey: stateEv.getStateKey(),
                }}
            />;
        }

        return (<div>
            <div className="mx_Dialog_content">
                <FilteredList query={this.state.query} onChange={this.onQueryChange}>
                    {widgets.map(w => {
                        return <button
                            className='mx_DevTools_RoomStateExplorer_button'
                            key={w.url + w.eventId}
                            onClick={() => this.onEditWidget(w)}
                        >{w.url}</button>;
                    })}
                </FilteredList>
            </div>
            <div className="mx_Dialog_buttons">
                <button onClick={this.onBack}>{_t("Back")}</button>
            </div>
        </div>);
    }
}

class SettingsExplorer extends React.Component {
    static getLabel() {
        return _t("Settings Explorer");
    }

    constructor(props) {
        super(props);

        this.state = {
            query: '',
            editSetting: null, // set to a setting ID when editing
            viewSetting: null, // set to a setting ID when exploring in detail

            explicitValues: null, // stringified JSON for edit view
            explicitRoomValues: null, // stringified JSON for edit view
        };
    }

    onQueryChange = (ev) => {
        this.setState({query: ev.target.value});
    };

    onExplValuesEdit = (ev) => {
        this.setState({explicitValues: ev.target.value});
    };

    onExplRoomValuesEdit = (ev) => {
        this.setState({explicitRoomValues: ev.target.value});
    };

    onBack = () => {
        if (this.state.editSetting) {
            this.setState({editSetting: null});
        } else if (this.state.viewSetting) {
            this.setState({viewSetting: null});
        } else {
            this.props.onBack();
        }
    };

    onViewClick = (ev, settingId) => {
        ev.preventDefault();
        this.setState({viewSetting: settingId});
    };

    onEditClick = (ev, settingId) => {
        ev.preventDefault();
        this.setState({
            editSetting: settingId,
            explicitValues: this.renderExplicitSettingValues(settingId, null),
            explicitRoomValues: this.renderExplicitSettingValues(settingId, this.props.room.roomId),
        });
    };

    onSaveClick = async () => {
        try {
            const settingId = this.state.editSetting;
            const parsedExplicit = JSON.parse(this.state.explicitValues);
            const parsedExplicitRoom = JSON.parse(this.state.explicitRoomValues);
            for (const level of Object.keys(parsedExplicit)) {
                console.log(`[Devtools] Setting value of ${settingId} at ${level} from user input`);
                try {
                    const val = parsedExplicit[level];
                    await SettingsStore.setValue(settingId, null, level, val);
                } catch (e) {
                    console.warn(e);
                }
            }
            const roomId = this.props.room.roomId;
            for (const level of Object.keys(parsedExplicit)) {
                console.log(`[Devtools] Setting value of ${settingId} at ${level} in ${roomId} from user input`);
                try {
                    const val = parsedExplicitRoom[level];
                    await SettingsStore.setValue(settingId, roomId, level, val);
                } catch (e) {
                    console.warn(e);
                }
            }
            this.setState({
                viewSetting: settingId,
                editSetting: null,
            });
        } catch (e) {
            Modal.createTrackedDialog('Devtools - Failed to save settings', '', ErrorDialog, {
                title: _t("Failed to save settings"),
                description: e.message,
            });
        }
    };

    renderSettingValue(val) {
        // Note: we don't .toString() a string because we want JSON.stringify to inject quotes for us
        const toStringTypes = ['boolean', 'number'];
        if (toStringTypes.includes(typeof(val))) {
            return val.toString();
        } else {
            return JSON.stringify(val);
        }
    }

    renderExplicitSettingValues(setting, roomId) {
        const vals = {};
        for (const level of LEVEL_ORDER) {
            try {
                vals[level] = SettingsStore.getValueAt(level, setting, roomId, true, true);
                if (vals[level] === undefined) {
                    vals[level] = null;
                }
            } catch (e) {
                console.warn(e);
            }
        }
        return JSON.stringify(vals, null, 4);
    }

    renderCanEditLevel(roomId, level) {
        const canEdit = SettingsStore.canSetValue(this.state.editSetting, roomId, level);
        const className = canEdit ? 'mx_DevTools_SettingsExplorer_mutable' : 'mx_DevTools_SettingsExplorer_immutable';
        return <td className={className}><code>{canEdit.toString()}</code></td>;
    }

    render() {
        const room = this.props.room;

        if (!this.state.viewSetting && !this.state.editSetting) {
            // view all settings
            const allSettings = Object.keys(SETTINGS)
                .filter(n => this.state.query ? n.toLowerCase().includes(this.state.query.toLowerCase()) : true);
            return (
                <div>
                    <div className="mx_Dialog_content mx_DevTools_SettingsExplorer">
                        <Field
                            label={_t('Filter results')} autoFocus={true} size={64}
                            type="text" autoComplete="off" value={this.state.query} onChange={this.onQueryChange}
                            className="mx_TextInputDialog_input mx_DevTools_RoomStateExplorer_query"
                        />
                        <table>
                            <thead>
                                <tr>
                                    <th>{_t("Setting ID")}</th>
                                    <th>{_t("Value")}</th>
                                    <th>{_t("Value in this room")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allSettings.map(i => (
                                    <tr key={i}>
                                        <td>
                                            <a href="" onClick={(e) => this.onViewClick(e, i)}>
                                                <code>{i}</code>
                                            </a>
                                            <a href="" onClick={(e) => this.onEditClick(e, i)}
                                                className='mx_DevTools_SettingsExplorer_edit'
                                            >
                                            ✏
                                            </a>
                                        </td>
                                        <td>
                                            <code>{this.renderSettingValue(SettingsStore.getValue(i))}</code>
                                        </td>
                                        <td>
                                            <code>
                                                {this.renderSettingValue(SettingsStore.getValue(i, room.roomId))}
                                            </code>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mx_Dialog_buttons">
                        <button onClick={this.onBack}>{_t("Back")}</button>
                    </div>
                </div>
            );
        } else if (this.state.editSetting) {
            return (
                <div>
                    <div className="mx_Dialog_content mx_DevTools_SettingsExplorer">
                        <h3>{_t("Setting:")} <code>{this.state.editSetting}</code></h3>

                        <div className='mx_DevTools_SettingsExplorer_warning'>
                            <b>{_t("Caution:")}</b> {_t(
                                "This UI does NOT check the types of the values. Use at your own risk.",
                            )}
                        </div>

                        <div>
                            {_t("Setting definition:")}
                            <pre><code>{JSON.stringify(SETTINGS[this.state.editSetting], null, 4)}</code></pre>
                        </div>

                        <div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>{_t("Level")}</th>
                                        <th>{_t("Settable at global")}</th>
                                        <th>{_t("Settable at room")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {LEVEL_ORDER.map(lvl => (
                                        <tr key={lvl}>
                                            <td><code>{lvl}</code></td>
                                            {this.renderCanEditLevel(null, lvl)}
                                            {this.renderCanEditLevel(room.roomId, lvl)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div>
                            <Field
                                id="valExpl" label={_t("Values at explicit levels")} type="text"
                                className="mx_DevTools_textarea" element="textarea"
                                autoComplete="off" value={this.state.explicitValues}
                                onChange={this.onExplValuesEdit}
                            />
                        </div>

                        <div>
                            <Field
                                id="valExpl" label={_t("Values at explicit levels in this room")} type="text"
                                className="mx_DevTools_textarea" element="textarea"
                                autoComplete="off" value={this.state.explicitRoomValues}
                                onChange={this.onExplRoomValuesEdit}
                            />
                        </div>

                    </div>
                    <div className="mx_Dialog_buttons">
                        <button onClick={this.onSaveClick}>{_t("Save setting values")}</button>
                        <button onClick={this.onBack}>{_t("Back")}</button>
                    </div>
                </div>
            );
        } else if (this.state.viewSetting) {
            return (
                <div>
                    <div className="mx_Dialog_content mx_DevTools_SettingsExplorer">
                        <h3>{_t("Setting:")} <code>{this.state.viewSetting}</code></h3>

                        <div>
                            {_t("Setting definition:")}
                            <pre><code>{JSON.stringify(SETTINGS[this.state.viewSetting], null, 4)}</code></pre>
                        </div>

                        <div>
                            {_t("Value:")}&nbsp;
                            <code>{this.renderSettingValue(SettingsStore.getValue(this.state.viewSetting))}</code>
                        </div>

                        <div>
                            {_t("Value in this room:")}&nbsp;
                            <code>{this.renderSettingValue(SettingsStore.getValue(this.state.viewSetting, room.roomId))}</code>
                        </div>

                        <div>
                            {_t("Values at explicit levels:")}
                            <pre><code>{this.renderExplicitSettingValues(this.state.viewSetting, null)}</code></pre>
                        </div>

                        <div>
                            {_t("Values at explicit levels in this room:")}
                            <pre><code>{this.renderExplicitSettingValues(this.state.viewSetting, room.roomId)}</code></pre>
                        </div>

                    </div>
                    <div className="mx_Dialog_buttons">
                        <button onClick={(e) => this.onEditClick(e, this.state.viewSetting)}>{_t("Edit Values")}</button>
                        <button onClick={this.onBack}>{_t("Back")}</button>
                    </div>
                </div>
            );
        }
    }
}

const Entries = [
    SendCustomEvent,
    RoomStateExplorer,
    SendAccountData,
    AccountDataExplorer,
    ServersInRoomList,
    VerificationExplorer,
    WidgetExplorer,
    SettingsExplorer,
];

@replaceableComponent("views.dialogs.DevtoolsDialog")
export default class DevtoolsDialog extends React.PureComponent {
    static propTypes = {
        roomId: PropTypes.string.isRequired,
        onFinished: PropTypes.func.isRequired,
    };

    constructor(props) {
        super(props);
        this.onBack = this.onBack.bind(this);
        this.onCancel = this.onCancel.bind(this);

        this.state = {
            mode: null,
        };
    }

    componentWillUnmount() {
        this._unmounted = true;
    }

    _setMode(mode) {
        return () => {
            this.setState({ mode });
        };
    }

    onBack() {
        if (this.prevMode) {
            this.setState({ mode: this.prevMode });
            this.prevMode = null;
        } else {
            this.setState({ mode: null });
        }
    }

    onCancel() {
        this.props.onFinished(false);
    }

    render() {
        let body;

        if (this.state.mode) {
            body = <MatrixClientContext.Consumer>
                {(cli) => <React.Fragment>
                    <div className="mx_DevTools_label_left">{ this.state.mode.getLabel() }</div>
                    <div className="mx_DevTools_label_right">Room ID: { this.props.roomId }</div>
                    <div className="mx_DevTools_label_bottom" />
                    <this.state.mode onBack={this.onBack} room={cli.getRoom(this.props.roomId)} />
                </React.Fragment>}
            </MatrixClientContext.Consumer>;
        } else {
            const classes = "mx_DevTools_RoomStateExplorer_button";
            body = <React.Fragment>
                <div>
                    <div className="mx_DevTools_label_left">{ _t('Toolbox') }</div>
                    <div className="mx_DevTools_label_right">Room ID: { this.props.roomId }</div>
                    <div className="mx_DevTools_label_bottom" />

                    <div className="mx_Dialog_content">
                        { Entries.map((Entry) => {
                            const label = Entry.getLabel();
                            const onClick = this._setMode(Entry);
                            return <button className={classes} key={label} onClick={onClick}>{ label }</button>;
                        }) }
                    </div>
                </div>
                <div className="mx_Dialog_buttons">
                    <button onClick={this.onCancel}>{ _t('Cancel') }</button>
                </div>
            </React.Fragment>;
        }

        const BaseDialog = sdk.getComponent('views.dialogs.BaseDialog');
        return (
            <BaseDialog className="mx_QuestionDialog" onFinished={this.props.onFinished} title={_t('Developer Tools')}>
                { body }
            </BaseDialog>
        );
    }
}
