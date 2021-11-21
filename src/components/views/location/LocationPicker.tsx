/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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
import maplibregl from 'maplibre-gl';

import SdkConfig from '../../../SdkConfig';
import Field from "../elements/Field";
import DialogButtons from "../elements/DialogButtons";
import Dropdown from "../elements/Dropdown";

import { _t } from '../../../languageHandler';
import { replaceableComponent } from "../../../utils/replaceableComponent";

enum LocationShareType {
    CUSTOM = -1,
    ONE_OFF = 0,
    ONE_MIN = 60,
    FIVE_MINS = 5 * 60,
    THIRTY_MINS = 30 * 60,
    ONE_HOUR = 60 * 60,
    THREE_HOURS = 3 * 60 * 60,
    SIX_HOURS = 6 * 60 * 60,
    ONE_DAY = 24 * 60 * 60,
    FOREVER = Number.MAX_SAFE_INTEGER,
}

interface IDropdownProps {
    value: JoinRule;
    label: string;
    width?: number;
    onChange(type: LocationShareType): void;
}

const LocationShareTypeDropdown = ({
    value,
    label,
    width,
    onChange,
}: IDropdownProps) => {
    const options = [
        <div key={LocationShareType.CUSTOM}>{ _t("Share custom location") }</div>,
        <div key={LocationShareType.ONE_OFF}>{ _t("Share my current location as a one off") }</div>,
        <div key={LocationShareType.ONE_MIN}>{ _t("Share my current location for one minute") }</div>,
        <div key={LocationShareType.FIVE_MINS}>{ _t("Share my current location for five minutes") }</div>,
        <div key={LocationShareType.THIRTY_MINS}>{ _t("Share my current location for thirty minutes") }</div>,
        <div key={LocationShareType.ONE_HOUR}>{ _t("Share my current location for one hour") }</div>,
        <div key={LocationShareType.THREE_HOURS}>{ _t("Share my current location for three hours") }</div>,
        <div key={LocationShareType.SIX_HOURS}>{ _t("Share my current location for six hours") }</div>,
        <div key={LocationShareType.ONE_DAY}>{ _t("Share my current location for one day") }</div>,
        <div key={LocationShareType.FOREVER}>{ _t("Share my current location until I disable it") }</div>,
    ];

    return <Dropdown
        id="mx_LocationShareTypeDropdown"
        className="mx_LocationShareTypeDropdown"
        onOptionChange={onChange}
        width={width}
        value={value}
    >
        { options }
    </Dropdown>;
};

interface IProps {
    onChoose(uri: string, ts: integer, type: LocationShareType, description: string): boolean;
    onCancel();
}

interface IState {
    description: string;
    type: LocationShareType;
    position: GeolocationPosition;
}

@replaceableComponent("views.location.LocationPicker")
class LocationPicker extends React.Component<IProps, IState> {
    constructor(props) {
        super(props);

        this.state = {
            description: "",
            type: LocationShareType.ONE_OFF,
            position: undefined,
        };
    }

    componentDidMount() {
        const config = SdkConfig.get();
        this.map = new maplibregl.Map({
            container: 'mx_LocationPicker_map',
            style: config.map_style_url,
            center: [0, 0],
            zoom: 1,
        });

        // Add geolocate control to the map.
        this.geolocate = new maplibregl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true,
            },
            trackUserLocation: true,
        });
        this.map.addControl(this.geolocate);

        this.map.on('load', ()=>{
            this.geolocate.trigger();
        });

        this.geolocate.on('geolocate', this.onGeolocate);
    }

    componentWillUnmount() {
        this.geolocate.off('geolocate', this.onGeolocate);
    }

    private onGeolocate = (position) => {
        this.setState({ position });
    };

    private onDescriptionChange = (ev: ChangeEvent<HTMLInputElement>) => {
        this.setState({ description: ev.target.value });
    };

    private getGeoUri = (position) => {
        return (`geo:${ position.coords.latitude },` +
                position.coords.longitude +
                ( position.coords.altitude != null ?
                    `,${ position.coords.altitude }` : '' ) +
                `;u=${ position.coords.accuracy }`);
    };

    private onOk = () => {
        this.props.onChoose(
            this.state.position ? this.getGeoUri(this.state.position) : undefined,
            this.state.position ? this.state.position.timestamp : undefined,
            this.state.type,
            this.state.description,
        );
        this.props.onFinished();
    };

    private onTypeChange= (type: LocationShareType) => {
        this.setState({ type });
    };

    render() {
        return (
            <div className="mx_LocationPicker">
                <div id="mx_LocationPicker_map" />
                <div className="mx_LocationPicker_footer">
                    <form onSubmit={this.onOk} onKeyDown={this.onKeyDown}>
                        <LocationShareTypeDropdown
                            value={this.state.type}
                            onChange={this.onTypeChange}
                            width={400}
                        />

                        <Field
                            label={_t('Description')}
                            onChange={this.onDescriptionChange}
                            value={this.state.description}
                            width={400}
                            className="mx_LocationPicker_description"
                        />

                        <DialogButtons primaryButton={_t('Share')}
                            onPrimaryButtonClick={this.onOk}
                            onCancel={this.props.onFinished} />
                    </form>
                </div>
            </div>
        );
    }
}

export default LocationPicker;
