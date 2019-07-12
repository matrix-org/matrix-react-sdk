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

import React from 'react';
import PropTypes from 'prop-types';

import { _t } from '../../../languageHandler';
import sdk from '../../../index';
import MatrixClientPeg from '../../../MatrixClientPeg';
import { unicodeToShortcode } from '../../../HtmlUtils';

export default class BridgeError extends React.PureComponent {
    static propTypes = {
        matrixClient: PropTypes.object.isRequired,
        mxEvent: PropTypes.object.isRequired,
    };

    constructor(props) {
        super(props);
        // this.state = {}
    }

    _get_relations() {
        const { mxEvent, room } = this.props;

        // const room = matrixClient.getRoom(mxEvent.getRoomId());
        const timelineSet = room.getUnfilteredTimelineSet();
        return timelineSet.getRelationsForEvent(
            mxEvent.getId(),
            "m.reference",
            "de.nasnotfound.bridge_error",
        );        
    }

    render() {
        const relations = this._get_relations()
        const isBridgeError = !!(relations && relations.getRelations());

        if (!isBridgeError) {
            return null
        }

        return (
            <div className="mx_BridgeError">
                ⚠ {_t("Event not delivered")}
            </div>
        );
    }
}
