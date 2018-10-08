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

import React from 'react';
import PropTypes from 'prop-types';
import sdk from '../../../index';
import SyntaxHighlight from '../elements/SyntaxHighlight';
import { _t } from '../../../languageHandler';
import MatrixClientPeg from '../../../MatrixClientPeg';

class DevtoolsComponent extends React.Component {
    static contextTypes = {
        roomId: PropTypes.string.isRequired,
    };
}

class GenericEditor extends DevtoolsComponent {
    // static propTypes = {onBack: PropTypes.func.isRequired};

    constructor(props, context) {
        super(props, context);
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
        return <div className="mx_DevTools_inputRow">
            <div className="mx_DevTools_inputLabelCell">
                <label htmlFor={id}>{ label }</label>
            </div>
            <div className="mx_DevTools_inputCell">
                <input id={id} className="mx_TextInputDialog_input" onChange={this._onChange} value={this.state[id]} size="32" autoFocus={true} />
            </div>
        </div>;
    }
}

class SendCustomEvent extends GenericEditor {
    static getLabel() { return _t('Send Custom Event'); }

    static propTypes = {
        onBack: PropTypes.func.isRequired,
        forceStateEvent: PropTypes.bool,
        inputs: PropTypes.object,
    };

    constructor(props, context) {
        super(props, context);
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
        const cli = MatrixClientPeg.get();
        if (this.state.isStateEvent) {
            return cli.sendStateEvent(this.context.roomId, this.state.eventType, content, this.state.stateKey);
        } else {
            return cli.sendEvent(this.context.roomId, this.state.eventType, content);
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

        return <div>
            <div className="mx_DevTools_content">
                { this.textInput('eventType', _t('Event Type')) }
                { this.state.isStateEvent && this.textInput('stateKey', _t('State Key')) }

                <br />

                <div className="mx_DevTools_inputLabelCell">
                    <label htmlFor="evContent"> { _t('Event Content') } </label>
                </div>
                <div>
                    <textarea id="evContent" onChange={this._onChange} value={this.state.evContent} className="mx_DevTools_textarea" />
                </div>
            </div>
            <div className="mx_Dialog_buttons">
                <button onClick={this.onBack}>{ _t('Back') }</button>
                { !this.state.message && <button onClick={this._send}>{ _t('Send') }</button> }
                { !this.state.message && !this.props.forceStateEvent && <div style={{float: "right"}}>
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
        isRoomAccountData: PropTypes.bool,
        forceMode: PropTypes.bool,
        inputs: PropTypes.object,
    };

    constructor(props, context) {
        super(props, context);
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
        const cli = MatrixClientPeg.get();
        if (this.state.isRoomAccountData) {
            return cli.setRoomAccountData(this.context.roomId, this.state.eventType, content);
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

                <div className="mx_DevTools_inputLabelCell">
                    <label htmlFor="evContent"> { _t('Event Content') } </label>
                </div>
                <div>
                    <textarea id="evContent" onChange={this._onChange} value={this.state.evContent} className="mx_DevTools_textarea" />
                </div>
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

class FilteredList extends React.Component {
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

    constructor(props, context) {
        super(props, context);

        this.state = {
            filteredChildren: FilteredList.filterChildren(this.props.children, this.props.query),
            truncateAt: INITIAL_LOAD_TILES,
        };
    }

    componentWillReceiveProps(nextProps) {
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
            <input size="64"
                   autoFocus={true}
                   onChange={this.onQuery}
                   value={this.props.query}
                   placeholder={_t('Filter results')}
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

class RoomStateExplorer extends DevtoolsComponent {
    static getLabel() { return _t('Explore Room State'); }


    static propTypes = {
        onBack: PropTypes.func.isRequired,
    };

    constructor(props, context) {
        super(props, context);

        const room = MatrixClientPeg.get().getRoom(this.context.roomId);
        this.roomStateEvents = room.currentState.events;

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
                return <SendCustomEvent forceStateEvent={true} onBack={this.onBack} inputs={{
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
                    Object.keys(this.roomStateEvents).map((evType) => {
                        const stateGroup = this.roomStateEvents[evType];
                        const stateKeys = Object.keys(stateGroup);

                        let onClickFn;
                        if (stateKeys.length === 1 && stateKeys[0] === '') {
                            onClickFn = this.onViewSourceClick(stateGroup[stateKeys[0]]);
                        } else {
                            onClickFn = this.browseEventType(evType);
                        }

                        return <button className={classes} key={evType} onClick={onClickFn}>
                            { evType }
                        </button>;
                    })
                }
            </FilteredList>;
        } else {
            const stateGroup = this.roomStateEvents[this.state.eventType];

            list = <FilteredList query={this.state.queryStateKey} onChange={this.onQueryStateKey}>
                {
                    Object.keys(stateGroup).map((stateKey) => {
                        const ev = stateGroup[stateKey];
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

class AccountDataExplorer extends DevtoolsComponent {
    static getLabel() { return _t('Explore Account Data'); }

    static propTypes = {
        onBack: PropTypes.func.isRequired,
    };

    constructor(props, context) {
        super(props, context);

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
        const cli = MatrixClientPeg.get();
        if (this.state.isRoomAccountData) {
            return cli.getRoom(this.context.roomId).accountData;
        }
        return cli.store.accountData;
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
                return <SendAccountData isRoomAccountData={this.state.isRoomAccountData} onBack={this.onBack} inputs={{
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

const Entries = [
    SendCustomEvent,
    RoomStateExplorer,
    SendAccountData,
    AccountDataExplorer,
];

export default class DevtoolsDialog extends React.Component {
    static childContextTypes = {
        roomId: PropTypes.string.isRequired,
        // client: PropTypes.instanceOf(MatixClient),
    };

    static propTypes = {
        roomId: PropTypes.string.isRequired,
        onFinished: PropTypes.func.isRequired,
    };

    constructor(props, context) {
        super(props, context);
        this.onBack = this.onBack.bind(this);
        this.onCancel = this.onCancel.bind(this);

        this.state = {
            mode: null,
        };
    }

    componentWillUnmount() {
        this._unmounted = true;
    }

    getChildContext() {
        return { roomId: this.props.roomId };
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
            body = <div>
                <div className="mx_DevTools_label_left">{ this.state.mode.getLabel() }</div>
                <div className="mx_DevTools_label_right">Room ID: { this.props.roomId }</div>
                <div className="mx_DevTools_label_bottom" />
                <this.state.mode onBack={this.onBack} />
            </div>;
        } else {
            const classes = "mx_DevTools_RoomStateExplorer_button";
            body = <div>
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
            </div>;
        }

        const BaseDialog = sdk.getComponent('views.dialogs.BaseDialog');
        return (
            <BaseDialog className="mx_QuestionDialog" onFinished={this.props.onFinished} title={_t('Developer Tools')}>
                { body }
            </BaseDialog>
        );
    }
}
