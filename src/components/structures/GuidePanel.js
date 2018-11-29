/*
Copyright 2018 New Vector Ltd

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
import WidgetUtils from '../../utils/WidgetUtils';
import AppTile from '../views/elements/AppTile';
import MatrixClientPeg from '../../MatrixClientPeg';
import PersistedElement from '../views/elements/PersistedElement';
import InlineSpinner from '../views/elements/InlineSpinner';

// FIXME / TODO -- This should not be hard-coded
const widgetUrl = 'https://localhost:6698';

const GuidePanel = React.createClass({
    displayName: 'GuidePanel',

    propTypes: {
        roomId: PropTypes.string.isRequired,
    },

    getInitialState: function() {
        return {
            busy: true,
            error: null,
            guideWidget: null,
        };
    },

    componentDidMount: async function() {
        let guideWidget = this._getGuideBotWidget();
        if (!guideWidget) {
            console.warn('Creating new guide bot widget');
            await WidgetUtils.setUserWidget('krakenGuideBot_1', 'krakenGuideBot', widgetUrl, 'Kraken Guide Bot', {});
            guideWidget = this._getGuideBotWidget();
        } else {
            console.log('Found guide bot widget', guideWidget);
        }

        const state = {
            busy: false,
            guideWidget,
        };

        if (!guideWidget) {
            state.error = 'Failed to intialise guide widget';
        }
        this.setState(state);
    },

    _getGuideBotWidget: function() {
        const userWidgets = WidgetUtils.getUserWidgetsArray();
        if (userWidgets) {
            return userWidgets.find(widget => {
                if (widget && widget.content && widget.content.type === 'krakenGuideBot') {
                    return widget;
                }
            });
        }
        return null;
    },

    render() {
        // const AppTile = sdk.getComponent("views.elements.AppTile");

        return (
            <div className="mx_GuidePanel">
            {this.state.busy && <InlineSpinner />}
            {!this.state.busy && this.state.guideWidget && (
                <PersistedElement persistKey="guideBot" style={{zIndex: 5001}}>
                    <AppTile
                        id={this.state.guideWidget.id}
                        url={this.state.guideWidget.content.url}
                        name={this.state.guideWidget.content.name}
                        room={MatrixClientPeg.get().getRoom(this.props.roomId)}
                        type={this.state.guideWidget.content.type}
                        fullWidth={true}
                        userId={MatrixClientPeg.get().credentials.userId}
                        creatorUserId={MatrixClientPeg.get().credentials.userId}
                        waitForIframeLoad={true}
                        show={true}
                        showMenubar={false}
                        showTitle={false}
                        showMinimise={false}
                        showDelete={false}
                        showPopout={false}
                        whitelistCapabilities={['m.always_on_screen', 'mil.defcon', 'm.geo', 'mil.instructions']}
                        userWidget={true}
                        tallMode={true}
                        borderless={true}
                    />
                </PersistedElement>
            )}
            </div>
        );
    },
});

module.exports = GuidePanel;
