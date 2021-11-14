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
    width = 448,
    onChange,
}: IDropDownProps) => {
    const options = [
        <div key={ LocationShareType.CUSTOM }>{ _t("custom location") }</div>,
        <div key={ LocationShareType.ONE_OFF }>{ _t("current location as a one off") }</div>,
        <div key={ LocationShareType.ONE_MIN }>{ _t("current location for one minute") }</div>,
        <div key={ LocationShareType.FIVE_MINS }>{ _t("current location for five minutes") }</div>,
        <div key={ LocationShareType.THIRTY_MINS }>{ _t("current location for thirty minutes") }</div>,
        <div key={ LocationShareType.ONE_HOUR }>{ _t("current location for one hour") }</div>,
        <div key={ LocationShareType.THREE_HOURS }>{ _t("current location for three hours") }</div>,
        <div key={ LocationShareType.SIX_HOURS }>{ _t("current location for six hours") }</div>,
        <div key={ LocationShareType.ONE_DAY }>{ _t("current location for one day") }</div>,
        <div key={ LocationShareType.FOREVER }>{ _t("current location until I disable it") }</div>,
    ];

    return <Dropdown
        id="mx_LocationShareTypeDropdown"
        className="mx_LocationShareTypeDropdown"
        onOptionChange={onChange}
        menuWidth={width}
        value={value}
        label={_t("Share my")}
    >
        { options }
    </Dropdown>;
};

interface IProps {
    onChoose(uri: string, type: string, description: string, beacon: boolean): boolean;
}

interface IState {
    description: string;
    type: LocationShareType;
}

@replaceableComponent("views.location.LocationPicker")
class LocationPicker extends React.Component<IProps, IState> {

    constructor(props) {
        super(props);

        this.state = {
            description: "",
            type: LocationShareType.ONE_OFF,
        };        
    }

    componentDidMount() {
        const config = SdkConfig.get();
        var map = new maplibregl.Map({
            container: 'mx_LocationPicker_map',
            style: config.map_style_url,
            center: [0, 0],
            zoom: 1,
        });
    }

    onDescriptionChange(description: string) {
        // TODO
    }

    onOk() {
        // TODO
    }

    onCancel() {
        // TODO        
    }

    onTypeChange(type: LocationShareType) {

    }

    render() {
        return (
            <div className="mx_LocationPicker">
                <div className="mx_LocationPicker_header">
                    Share location
                </div>
                <div id ="mx_LocationPicker_map">
                </div>
                <form onSubmit={this.onOk} onKeyDown={this.onKeyDown}>
                    <div className="mx_LocationPicker_footer">
                        <LocationShareTypeDropdown
                            value={this.state.type}
                            onChange={this.onTypeChange}
                        />

                        <Field
                            label={_t('Description')}
                            onChange={this.onDescriptionChange}
                            value={this.state.description}
                            className="mx_LocationPicker_description"
                        />
                    </div>
                    <DialogButtons primaryButton={_t('Share')}
                        onPrimaryButtonClick={this.onOk}
                        onCancel={this.onCancel} />
                </form>
            </div>
        );
    }
}

export default LocationPicker;
