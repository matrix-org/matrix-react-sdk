/*
Copyright 2019 New Vector Ltd

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

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { _t } from '../../../languageHandler';
import * as sdk from '../../../index';
import classnames from 'classnames';
import {ValidatedServerConfig} from "../../../utils/AutoDiscoveryUtils";
import { ButtonEvent } from '../elements/AccessibleButton';

const MODULAR_URL = 'https://element.io/matrix-services' +
    '?utm_source=element-web&utm_medium=web&utm_campaign=element-web-authentication';

export const FREE = 'Free';
export const PREMIUM = 'Premium';
export const ADVANCED = 'Advanced';

export type ServerTypeID = 'Free' | 'Premium' | 'Advanced';
export type ServerTypeKey = 'FREE' | 'PREMIUM' | 'ADVANCED';

export interface ServerType {
    id: ServerTypeID;
    label: () => string | React.ReactNode;
    logo: () => string | React.ReactNode;
    description: () => string | React.ReactNode;
    serverConfig?: ValidatedServerConfig;
    identityServerUrl?: string;
}

export const TYPES: Record<'FREE' | 'PREMIUM' | 'ADVANCED', ServerType> = {
    FREE: {
        id: FREE,
        label: () => _t('Free'),
        logo: () => <img src={require('../../../../res/img/matrix-org-bw-logo.svg')} />,
        description: () => _t('Join millions for free on the largest public server'),
        serverConfig: {
            hsUrl: "https://matrix-client.matrix.org",
            hsName: "matrix.org",
            hsNameIsDifferent: false,
            isUrl: "https://vector.im",
        }
    },
    PREMIUM: {
        id: PREMIUM,
        label: () => _t('Premium'),
        logo: () => <img src={require('../../../../res/img/ems-logo.svg')} height={16} />,
        description: () => _t('Premium hosting for organisations <a>Learn more</a>', {}, {
            a: sub => <a href={MODULAR_URL} target="_blank" rel="noreferrer noopener">
                {sub}
            </a>,
        }),
        identityServerUrl: "https://vector.im",
    },
    ADVANCED: {
        id: ADVANCED,
        label: () => _t('Advanced'),
        logo: () => <div>
            <img src={require('../../../../res/img/feather-customised/globe.svg')} />
            {_t('Other')}
        </div>,
        description: () => _t('Find other public servers or use a custom server'),
    },
};

export function getTypeFromServerConfig(config) {
    const {hsUrl} = config;
    if (!hsUrl) {
        return null;
    } else if (hsUrl === TYPES.FREE.serverConfig.hsUrl) {
        return FREE;
    } else if (new URL(hsUrl).hostname.endsWith('.modular.im')) {
        // This is an unlikely case to reach, as Modular defaults to hiding the
        // server type selector.
        return PREMIUM;
    } else {
        return ADVANCED;
    }
}

export interface IProps {
    selected: string;
    onChange: (type: ServerTypeKey) => void;
}

export default function ServerTypeSelector (props: IProps) {
    const [selected, setSelected] = useState(props.selected);

    function updateSelectedType (type: ServerTypeKey) {
        if (selected === type) {
            return;
        }

        setSelected(type);

        if (props.onChange) {
            props.onChange(type);
        }
    }

    function onClick (event: ButtonEvent) {
        const type = (event.currentTarget as EventTarget & HTMLDivElement).dataset.id;

        event.stopPropagation();
        updateSelectedType(type as ServerTypeKey);
    }

    const AccessibleButton = sdk.getComponent('elements.AccessibleButton');

    const serverTypes = Object.values(TYPES).map(type => {
        const { id, label, logo, description } = type;
        const classes = classnames(
            "mx_ServerTypeSelector_type",
            `mx_ServerTypeSelector_type_${id}`,
            {
                "mx_ServerTypeSelector_type_selected": id === selected,
            },
        );

        return (
            <div className={classes} key={id} >
            <div className="mx_ServerTypeSelector_label">
                {label()}
            </div>
            <AccessibleButton onClick={onClick} data-id={id}>
                <div className="mx_ServerTypeSelector_logo">
                    {logo()}
                </div>
                <div className="mx_ServerTypeSelector_description">
                    {description()}
                </div>
            </AccessibleButton>
            </div>
        );
    });

    return <div className="mx_ServerTypeSelector">
        {serverTypes}
    </div>;
}

ServerTypeSelector.propTypes = {
    // The default selected type.
    selected: PropTypes.string,
    // Handler called when the selected type changes.
    onChange: PropTypes.func.isRequired,
};
