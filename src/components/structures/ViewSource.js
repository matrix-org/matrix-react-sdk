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

import React from 'react';
import PropTypes from 'prop-types';
import SyntaxHighlight from '../views/elements/SyntaxHighlight';


module.exports = React.createClass({
    displayName: 'ViewSource',

    propTypes: {
        content: PropTypes.object.isRequired,
        onFinished: PropTypes.func.isRequired,
    },

    componentDidMount: function() {
        document.addEventListener("keydown", this.onKeyDown);
    },

    componentWillUnmount: function() {
        document.removeEventListener("keydown", this.onKeyDown);
    },

    onKeyDown: function(ev) {
        if (ev.keyCode == 27) { // escape
            ev.stopPropagation();
            ev.preventDefault();
            this.props.onFinished();
        }
    },

    render: function() {
        return (
            <div className="mx_ViewSource">
                <SyntaxHighlight className="json">
                    { JSON.stringify(this.props.content, null, 2) }
                </SyntaxHighlight>
            </div>
        );
    },
});
