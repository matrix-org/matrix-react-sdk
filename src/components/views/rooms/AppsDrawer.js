/*
Copyright 2015, 2016 OpenMarket Ltd

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

'use strict';

const React = require('react');
const MatrixClientPeg = require('../../../MatrixClientPeg');
const AddAppDialog = require('../dialogs/AddAppDialog');
const AppTile = require('../elements/AppTile');
const Modal = require("../../../Modal");
const dis = require('../../../dispatcher');

module.exports = React.createClass({
    displayName: 'AppsDrawer',

    propTypes: {
        room: React.PropTypes.object.isRequired,
    },

    componentWillMount: function() {
        MatrixClientPeg.get().on("RoomState.events", this.onRoomStateEvents);
    },

    componentDidMount: function() {
        if (this.state.apps && this.state.apps.length < 1) {
            this.onClickAddWidget();
        }
    },

    componentWillUnmount: function() {
        if (MatrixClientPeg.get()) {
            MatrixClientPeg.get().removeListener("RoomState.events", this.onRoomStateEvents);
        }
    },

    _initAppConfig: function(appId, app) {
        console.log("App props: ", this.props);
        app.id = appId;
        app.name = app.type;

        switch(app.type) {
            case 'etherpad':
                app.queryParams = '?userName=' + this.props.userId +
                    '&padId=' + this.props.room.roomId;
                break;
                case 'agario':
                    app.queryParams = '?userName=' + this.props.userId +
                        '&room=' + this.props.room.roomId;
                break;
            case 'jitsi': {
                const user = MatrixClientPeg.get().getUser(this.props.userId);
                app.queryParams = '?confId=' + app.data.confId +
                    '&displayName=' + encodeURIComponent(user.displayName) +
                    '&avatarUrl=' + encodeURIComponent(MatrixClientPeg.get().mxcUrlToHttp(user.avatarUrl)) +
                    '&email=' + encodeURIComponent(this.props.userId) +
                    '&isAudioConf=' + app.data.isAudioConf;

                app.name += ' - ' + app.data.confId;
                break;
            }
            case 'lg':
                app.queryParams = '?roomId=' + this.props.room.roomId;
                break;
            case 'tip': {
                const user = MatrixClientPeg.get().getUser(this.props.userId);
                app.queryParams = '?roomId=' + this.props.room.roomId +
                    '&displayName=' + encodeURIComponent(user.displayName);
                break;
            }
            case 'vrdemo':
                app.name = 'Matrix VR Demo - ' + app.data.roomAlias;
                app.queryParams = '?roomAlias=' + encodeURIComponent(app.data.roomAlias);
                break;
        }

        return app;
    },

    getInitialState: function() {
        return {
            apps: this._getApps(),
        };
    },

    onRoomStateEvents: function(ev, state) {
        if (ev.getRoomId() !== this.props.room.roomId || ev.getType() !== 'im.vector.modular.widgets') {
            return;
        }
        this._updateApps();
    },

    _getApps: function() {
        const appsStateEvents = this.props.room.currentState.getStateEvents('im.vector.modular.widgets', '');
        if (!appsStateEvents) {
            return [];
        }
        const appsStateEvent = appsStateEvents.getContent();
        if (Object.keys(appsStateEvent).length < 1) {
            return [];
        }

        return Object.keys(appsStateEvent).map((appId) => {
            return this._initAppConfig(appId, appsStateEvent[appId]);
        });
    },

    _updateApps: function() {
        const apps = this._getApps();
        if (apps.length < 1) {
            dis.dispatch({
                action: 'appsDrawer',
                show: false,
            });
        }
        this.setState({
            apps: this._getApps(),
        });
    },

    onClickAddWidget: function() {
        Modal.createDialog(AddAppDialog, {
            onFinished: (proceed, widget, value) => {
                if (!proceed || !widget) return;

                const widgetObj = {
                    type: widget.type,
                };
                if (widget.type === 'custom') {
                    if (!value) {
                        return;
                    }
                    widgetObj.url = value;
                } else {
                    widgetObj.url = widget.url;
                }

                const appsStateEvents = this.props.room.currentState.getStateEvents('im.vector.modular.widgets', '');
                let appsStateEvent = {};
                if (appsStateEvents) {
                    appsStateEvent = appsStateEvents.getContent();
                }

                if (appsStateEvent[widget.type]) {
                    return;
                }

                appsStateEvent[widget.type] = widgetObj;
                switch (widget.type) {
                    case 'jitsi':
                        appsStateEvent[widget.type].data = {
                            confId: this.props.room.roomId.replace(/[^A-Za-z0-9]/g, '_') + Date.now(),
                        };
                        break;
                    case 'vrdemo':
                        appsStateEvent[widget.type].data = {
                            roomAlias: '#vrvc' + this.props.room.roomId.replace(/[^A-Za-z0-9]/g, '_') + Date.now(),
                        };
                        break;
                    case 'gdocs':
                        const url = prompt('Published URL of the document\nThe published URL can be found in File > Publish to the web... in the Google Docs interface');
                        if(!url) {
                            return;
                        } else if(!url.includes('https://docs.google.com/document') || !url.includes('/pub')) {
                            alert('"'+ url +'" is not a valid Google Docs published URL');
                            return;
                        }

                        appsStateEvent[widget.type].url = url;

                        if(!url.includes('?embedded=true')) {
                            appsStateEvent[widget.type].url += '?embedded=true';
                        }
                        break;
                }

                MatrixClientPeg.get().sendStateEvent(
                    this.props.room.roomId,
                    'im.vector.modular.widgets',
                    appsStateEvent,
                    '',
                );
            },
        });
    },

    render: function() {
        const apps = this.state.apps.map(
            (app, index, arr) => {
                let appUrl = app.url;
                if (app.queryParams) {
                    appUrl += app.queryParams;
                }
                return <AppTile
                    key={app.name}
                    id={app.id}
                    url={appUrl}
                    name={app.name}
                    fullWidth={arr.length<2 ? true : false}
                    room={this.props.room}
                    userId={this.props.userId}
                />;
            });

        const addWidget = this.state.apps && this.state.apps.length < 2 &&
            (<div onClick={this.onClickAddWidget}
                            role="button"
                            tabIndex="0"
                            className="mx_AddWidget_button"
                            title="Add a widget">
                            [+] Add a widget
                        </div>);

        return (
            <div className="mx_AppsDrawer">
                <div id="apps" className="mx_AppsContainer">
                    {apps}
                </div>
                {addWidget}
            </div>
        );
    },
});
