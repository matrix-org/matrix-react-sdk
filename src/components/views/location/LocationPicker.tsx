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

import React, { SyntheticEvent } from 'react';
import maplibregl, { MapMouseEvent } from 'maplibre-gl';
import { logger } from "matrix-js-sdk/src/logger";
import { RoomMember } from 'matrix-js-sdk/src/models/room-member';
import { ClientEvent, IClientWellKnown } from 'matrix-js-sdk/src/client';
import classNames from 'classnames';

import { _t } from '../../../languageHandler';
import { replaceableComponent } from "../../../utils/replaceableComponent";
import MemberAvatar from '../avatars/MemberAvatar';
import MatrixClientContext from '../../../contexts/MatrixClientContext';
import Modal from '../../../Modal';
import ErrorDialog from '../dialogs/ErrorDialog';
import { tileServerFromWellKnown } from '../../../utils/WellKnownUtils';
import { findMapStyleUrl } from './findMapStyleUrl';
import { LocationShareType } from './shareLocation';
import { Icon as LocationIcon } from '../../../../res/img/element-icons/location.svg';
import { LocationShareError } from './LocationShareErrors';
import AccessibleButton from '../elements/AccessibleButton';
import { MapError } from './MapError';
import { getUserNameColorClass } from '../../../utils/FormattingUtils';
export interface ILocationPickerProps {
    sender: RoomMember;
    shareType: LocationShareType;
    onChoose(uri: string, ts: number): unknown;
    onFinished(ev?: SyntheticEvent): void;
}

interface IPosition {
    latitude: number;
    longitude: number;
    altitude?: number;
    accuracy?: number;
    timestamp: number;
}
interface IState {
    position?: IPosition;
    error?: LocationShareError;
}

const isSharingOwnLocation = (shareType: LocationShareType): boolean =>
    shareType === LocationShareType.Own || shareType === LocationShareType.Live;

@replaceableComponent("views.location.LocationPicker")
class LocationPicker extends React.Component<ILocationPickerProps, IState> {
    public static contextType = MatrixClientContext;
    public context!: React.ContextType<typeof MatrixClientContext>;
    private map?: maplibregl.Map = null;
    private geolocate?: maplibregl.GeolocateControl = null;
    private marker?: maplibregl.Marker = null;

    constructor(props: ILocationPickerProps) {
        super(props);

        this.state = {
            position: undefined,
            error: undefined,
        };
    }

    private getMarkerId = () => {
        return "mx_MLocationPicker_marker";
    };

    componentDidMount() {
        this.context.on(ClientEvent.ClientWellKnown, this.updateStyleUrl);

        try {
            this.map = new maplibregl.Map({
                container: 'mx_LocationPicker_map',
                style: findMapStyleUrl(),
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

            this.map.on('error', (e) => {
                logger.error(
                    "Failed to load map: check map_style_url in config.json "
                    + "has a valid URL and API key",
                    e.error,
                );
                this.setState({ error: LocationShareError.MapStyleUrlNotReachable });
            });

            this.map.on('load', () => {
                this.geolocate.trigger();
            });

            this.geolocate.on('error', this.onGeolocateError);

            if (isSharingOwnLocation(this.props.shareType)) {
                this.geolocate.on('geolocate', this.onGeolocate);
            }

            if (this.props.shareType === LocationShareType.Pin) {
                const navigationControl = new maplibregl.NavigationControl({
                    showCompass: false, showZoom: true,
                });
                this.map.addControl(navigationControl, 'bottom-right');
                this.map.on('click', this.onClick);
            }
        } catch (e) {
            logger.error("Failed to render map", e);
            const errorType = e?.message === LocationShareError.MapStyleUrlNotConfigured ?
                LocationShareError.MapStyleUrlNotConfigured :
                LocationShareError.Default;
            this.setState({ error: errorType });
        }
    }

    componentWillUnmount() {
        this.geolocate?.off('error', this.onGeolocateError);
        this.geolocate?.off('geolocate', this.onGeolocate);
        this.map?.off('click', this.onClick);
        this.context.off(ClientEvent.ClientWellKnown, this.updateStyleUrl);
    }

    private addMarkerToMap = () => {
        this.marker = new maplibregl.Marker({
            element: document.getElementById(this.getMarkerId()),
            anchor: 'bottom',
            offset: [0, -1],
        }).setLngLat(new maplibregl.LngLat(0, 0))
            .addTo(this.map);
    };

    private updateStyleUrl = (clientWellKnown: IClientWellKnown) => {
        const style = tileServerFromWellKnown(clientWellKnown)?.["map_style_url"];
        if (style) {
            this.map?.setStyle(style);
        }
    };

    private onGeolocate = (position: GeolocationPosition) => {
        if (!this.marker) {
            this.addMarkerToMap();
        }
        this.setState({ position: genericPositionFromGeolocation(position) });
        this.marker?.setLngLat(
            new maplibregl.LngLat(
                position.coords.longitude,
                position.coords.latitude,
            ),
        );
    };

    private onClick = (event: MapMouseEvent) => {
        if (!this.marker) {
            this.addMarkerToMap();
        }
        this.marker?.setLngLat(event.lngLat);
        this.setState({
            position: {
                timestamp: Date.now(),
                latitude: event.lngLat.lat,
                longitude: event.lngLat.lng,
            },
        });
    };

    private onGeolocateError = (e: GeolocationPositionError) => {
        logger.error("Could not fetch location", e);
        // close the dialog and show an error when trying to share own location
        // pin drop location without permissions is ok
        if (isSharingOwnLocation(this.props.shareType)) {
            this.props.onFinished();
            Modal.createTrackedDialog(
                'Could not fetch location',
                '',
                ErrorDialog,
                {
                    title: _t("Could not fetch location"),
                    description: positionFailureMessage(e.code),
                },
            );
        }

        if (this.geolocate) {
            this.map?.removeControl(this.geolocate);
        }
    };

    private onOk = () => {
        const position = this.state.position;

        this.props.onChoose(position ? getGeoUri(position) : undefined, position?.timestamp);
        this.props.onFinished();
    };

    render() {
        if (this.state.error) {
            return <div className="mx_LocationPicker mx_LocationPicker_hasError">
                <MapError
                    error={this.state.error}
                    onFinished={this.props.onFinished} />
            </div>;
        }

        const userColorClass = getUserNameColorClass(this.props.sender.userId);

        return (
            <div className="mx_LocationPicker">
                <div id="mx_LocationPicker_map" />
                { this.props.shareType === LocationShareType.Pin && <div className="mx_LocationPicker_pinText">
                    <span>
                        { this.state.position ? _t("Click to move the pin") : _t("Click to drop a pin") }
                    </span>
                </div>
                }
                <div className="mx_LocationPicker_footer">
                    <form onSubmit={this.onOk}>

                        <AccessibleButton
                            data-test-id="location-picker-submit-button"
                            type="submit"
                            element='button'
                            kind='primary'
                            className='mx_LocationPicker_submitButton'
                            disabled={!this.state.position}
                            onClick={this.onOk}>
                            { _t('Share location') }
                        </AccessibleButton>
                    </form>
                </div>
                <div className={classNames(
                    "mx_MLocationBody_marker",
                    `mx_MLocationBody_marker-${this.props.shareType}`,
                    userColorClass,
                )}
                id={this.getMarkerId()}>
                    <div className="mx_MLocationBody_markerBorder">
                        { isSharingOwnLocation(this.props.shareType) ?
                            <MemberAvatar
                                member={this.props.sender}
                                width={27}
                                height={27}
                                viewUserOnClick={false}
                            />
                            : <LocationIcon className="mx_MLocationBody_markerIcon" />
                        }
                    </div>
                    <div
                        className="mx_MLocationBody_pointer"
                    />
                </div>
            </div>
        );
    }
}

const genericPositionFromGeolocation = (geoPosition: GeolocationPosition): IPosition => {
    const {
        latitude, longitude, altitude, accuracy,
    } = geoPosition.coords;
    return {
        timestamp: geoPosition.timestamp,
        latitude, longitude, altitude, accuracy,
    };
};

export function getGeoUri(position: IPosition): string {
    const lat = position.latitude;
    const lon = position.longitude;
    const alt = (
        Number.isFinite(position.altitude)
            ? `,${position.altitude}`
            : ""
    );
    const acc = (
        Number.isFinite(position.accuracy)
            ? `;u=${position.accuracy}`
            : ""
    );
    return `geo:${lat},${lon}${alt}${acc}`;
}

export default LocationPicker;

function positionFailureMessage(code: number): string {
    switch (code) {
        case 1: return _t(
            "Element was denied permission to fetch your location. " +
            "Please allow location access in your browser settings.",
        );
        case 2: return _t(
            "Failed to fetch your location. Please try again later.",
        );
        case 3: return _t(
            "Timed out trying to fetch your location. Please try again later.",
        );
        case 4: return _t(
            "Unknown error fetching location. Please try again later.",
        );
    }
}
