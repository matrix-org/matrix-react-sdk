/*
Copyright 2016 OpenMarket Ltd

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
import * as sdk from '../../../index';
import {replaceableComponent} from "../../../utils/replaceableComponent";

/*
 * A stripped-down room header used for things like the user settings
 * and room directory.
 */
@replaceableComponent("views.rooms.SimpleRoomHeader")
export default class SimpleRoomHeader extends React.Component {
    static propTypes = {
        title: PropTypes.string,

        // `src` to a TintableSvg. Optional.
        icon: PropTypes.string,
    };

    render() {
        let icon;
        if (this.props.icon) {
            const TintableSvg = sdk.getComponent('elements.TintableSvg');
            icon = <TintableSvg
                className="mx_RoomHeader_icon" src={this.props.icon}
                width="25" height="25"
            />;
        }

        return (
            <div className="mx_RoomHeader mx_RoomHeader_wrapper" >
                <div className="mx_RoomHeader_simpleHeader">
                    { icon }
                    { this.props.title }
                </div>
            </div>
        );
    }
}
