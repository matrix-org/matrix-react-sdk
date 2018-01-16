/*
Copyright 2015 OpenMarket Ltd

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
const ReactDOM = require("react-dom");
import PropTypes from 'prop-types';
const Tinter = require("../../../Tinter");

var TintableSvg = React.createClass({
    displayName: 'TintableSvg',

    propTypes: {
        src: PropTypes.string.isRequired,
        width: PropTypes.string.isRequired,
        height: PropTypes.string.isRequired,
        className: PropTypes.string,
    },

    statics: {
        // list of currently mounted TintableSvgs
        mounts: {},
        idSequence: 0,
    },

    componentWillMount: function() {
        this.fixups = [];
    },

    componentDidMount: function() {
        this.id = TintableSvg.idSequence++;
        TintableSvg.mounts[this.id] = this;
    },

    componentWillUnmount: function() {
        delete TintableSvg.mounts[this.id];
    },

    tint: function() {
        // TODO: only bother running this if the global tint settings have changed
        // since we loaded!
        Tinter.applySvgFixups(this.fixups);
    },

    onLoad: function(event) {
        // console.log("TintableSvg.onLoad for " + this.props.src);
        this.fixups = Tinter.calcSvgFixups([event.target]);
        Tinter.applySvgFixups(this.fixups);
    },

    render: function() {
        return (
            <object className={"mx_TintableSvg " + (this.props.className ? this.props.className : "")}
                    type="image/svg+xml"
                    data={this.props.src}
                    width={this.props.width}
                    height={this.props.height}
                    onLoad={this.onLoad}
                    tabIndex="-1"
                />
        );
    },
});

// Register with the Tinter so that we will be told if the tint changes
Tinter.registerTintable(function() {
    if (TintableSvg.mounts) {
        Object.keys(TintableSvg.mounts).forEach((id) => {
            TintableSvg.mounts[id].tint();
        });
    }
});

module.exports = TintableSvg;
