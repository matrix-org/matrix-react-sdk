/*
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

const React = require('react');
import PropTypes from 'prop-types';
import sdk from "../../../index";
import AppTile from "../elements/AppTile";
const TextForEvent = require('../../../TextForEvent');
import MatrixClientPeg from "../../../MatrixClientPeg";

export default class MWidgetBody extends React.Component {
    static propTypes: {
        mxEvent: PropTypes.object.isRequired, // MatrixEvent

        // Passthroughs for TextualBody
        highlights: PropTypes.array,
        highlightLink: PropTypes.string,
        showUrlPreview: PropTypes.bool,
        onHeightChanged: PropTypes.func,
        tileShape: PropTypes.string,
    };

    renderAsText() {
        const TextualBody = sdk.getComponent("messages.TextualBody");
        return <TextualBody
            mxEvent={this.props.mxEvent}
            highlights={this.props.highlights}
            highlightLink={this.props.highlightLink}
            showUrlPreview={this.props.showUrlPreview}
            onHeightChanged={this.props.onHeightChanged}
            tileShapse={this.props.tileShape}
        />;
    }

    render() {
        const widgetInfo = this.props.mxEvent.getContent();

        const widgetUrl = widgetInfo['widget_url'];
        if (!widgetUrl) {
            return this.renderAsText();
        }

        // TODO: Handle widget_html

        const AppTile = sdk.getComponent("elements.AppTile");

        // XXX: Is this a secure enough widget ID?
        return <AppTile
            id={this.props.mxEvent.getRoomId()+ "_" + this.props.mxEvent.getId()}
            url={widgetUrl}
            name={widgetInfo['name']}
            room={MatrixClientPeg.get().getRoom(this.props.mxEvent.getRoomId())}
            type={widgetInfo['type']}
            fullWidth={true}
            userId={MatrixClientPeg.get().credentials.userId}
            creatorUserId={this.props.mxEvent.getSender()}
            waitForIframeLoad={true}
            show={true}
            showMenubar={false}
            showTitle={false}
            showMinimise={false}
            showDelete={false}
            showCancel={false}
            showPopout={false}
            handleMinimisePointerEvents={false}
            whitelistCapabilities={[]}
        />;
    };
}
