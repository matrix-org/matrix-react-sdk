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

module.exports = React.createClass({
    displayName: 'RoomDropTarget',

    render: function() {
        return (
            <div className="mx_RoomDropTarget_container">
                <div className="mx_RoomDropTarget">
                    <div className="mx_RoomDropTarget_label">
                        { this.props.label }
                    </div>
                </div>
            </div>
        );
    },
});
