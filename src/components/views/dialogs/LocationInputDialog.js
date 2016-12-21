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

const React = require("react");
const Leaflet = require('leaflet');

const ZOOM_WORLD = 5; /** Zoom level for the selector */
const ZOOM_STREET = 15; /** Zoom level for a given location */

module.exports = React.createClass({
    displayName: 'LocationInputDialog',
    propTypes: {
        focus: React.PropTypes.bool,
        position: React.PropTypes.object,
        onFinished: React.PropTypes.func.isRequired,
    },

    getInitialState: function() {
        return {
            leafletMap: null,
            mapMarker: null,
            position: null,
        };
    },

    getDefaultProps: function() {
        return {
            focus: true,
            position: null,
        };
    },

    componentDidMount: function() {
        const leafletMap = new Leaflet.Map(this.refs.map);
        leafletMap.addLayer(
            new Leaflet.TileLayer(
                'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                {
                    minZoom: ZOOM_WORLD,
                    maxZoom: ZOOM_STREET,
                    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
                }
            )
        );

        let coords;
        let zoom;
        if (this.props.position) {
            coords = new Leaflet.LatLng(
                this.props.position.coords.latitude,
                this.props.position.coords.longitude,
            );
            zoom = ZOOM_STREET;
        } else {
            coords = new Leaflet.LatLng(0, 0);
            zoom = ZOOM_WORLD;
        }
        leafletMap.on('click', this.mapClick);
        leafletMap.setView(coords, zoom);
        Leaflet.Icon.Default.prototype.options.imagePath = "/img/";
        const mapMarker = new Leaflet.Marker(coords, {
            icon: new Leaflet.Icon.Default(),
        });
        leafletMap.addControl(mapMarker);
        this.setState({mapMarker, leafletMap, position: coords});
    },

    mapClick: function(ev) {
        this.state.leafletMap.panTo(ev.latlng);
        this.state.mapMarker.setLatLng(ev.latlng);
        this.setState({position: ev.latlng});
    },

    onOk: function() {
        const position = this.state.position;
        if (position === null || this.refs.textinput.value === "") {
            return;
        }
        const geo_uri = `geo:${position.lat},${position.lng}`;
        this.props.onFinished(true, this.refs.textinput.value, geo_uri);
    },

    onCancel: function() {
        this.props.onFinished(false);
    },

    render: function() {
        return (
            <div className="mx_LocationInputDialog">
                <div className="mx_Dialog_title">
                    Post Location
                </div>
                <div className="mx_Dialog_content">
                    <div ref="map" className="mx_LocationInputDialog_map">
                    </div>
                    <div>
                        <input required id="textinput" ref="textinput" className="mx_TextInputDialog_input" placeholder="Location Description" autoFocus={this.props.focus} size="64" onKeyDown={this.onKeyDown}/>
                    </div>
                </div>
                <div className="mx_Dialog_buttons">
                    <button onClick={this.onCancel}>
                        Cancel
                    </button>
                    <button className="mx_Dialog_primary" onClick={this.onOk}>
                        Post Location
                    </button>
                </div>
            </div>
        );
    },
});
