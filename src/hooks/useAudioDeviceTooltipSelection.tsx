/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

import React, { MutableRefObject, useRef, useState } from "react";

import { toLeftOrRightOf } from "../components/structures/ContextMenu";
import IconizedContextMenu, {
    IconizedContextMenuOptionList,
    IconizedContextMenuRadio,
} from "../components/views/context_menus/IconizedContextMenu";
import { _t } from "../languageHandler";
import MediaDeviceHandler, { MediaDeviceKindEnum } from "../MediaDeviceHandler";
import { requestMediaPermissions } from "../utils/media/requestMediaPermissions";

interface State {
    devices: MediaDeviceInfo[];
    device: MediaDeviceInfo | null;
    showDeviceSelect: boolean;
}

export const useAudioDeviceTooltipSelection = (
    containerRef: MutableRefObject<HTMLElement | null>,
    onDeviceChanged?: (device: MediaDeviceInfo) => void,
) => {
    const shouldRequestPermissionsRef = useRef<boolean>(true);
    const [state, setState] = useState<State>({
        devices: [],
        device: null,
        showDeviceSelect: false,
    });

    if (shouldRequestPermissionsRef.current) {
        shouldRequestPermissionsRef.current = false;
        requestMediaPermissions(false).then((stream: MediaStream | undefined) => {
            MediaDeviceHandler.getDevices().then(({ audioinput }) => {
                MediaDeviceHandler.getDefaultDevice(audioinput);
                const deviceFromSettings = MediaDeviceHandler.getAudioInput();
                const device = audioinput.find((d) => {
                    return d.deviceId === deviceFromSettings;
                }) || audioinput[0];
                setState({
                    ...state,
                    devices: audioinput,
                    device,
                });
                stream?.getTracks().forEach(t => t.stop());
            });
        });
    }

    const onDeviceOptionClick = (device: MediaDeviceInfo) => {
        const shouldNotify = device.deviceId !== state.device?.deviceId;
        MediaDeviceHandler.instance.setDevice(device.deviceId, MediaDeviceKindEnum.AudioInput);

        setState({
            ...state,
            device,
            showDeviceSelect: false,
        });

        if (shouldNotify) {
            onDeviceChanged?.(device);
        }
    };

    const onSelectDeviceClick = () => {
        setState({
            ...state,
            showDeviceSelect: true,
        });
    };

    const deviceOptions = state.devices.map((d: MediaDeviceInfo) => {
        return <IconizedContextMenuRadio
            key={d.deviceId}
            active={d.deviceId === state.device?.deviceId}
            onClick={() => onDeviceOptionClick(d)}
            label={d.label}
        />;
    });

    const devicesMenu = state.showDeviceSelect && containerRef.current
        ? <IconizedContextMenu
            mountAsChild={false}
            onFinished={() => {}}
            {...toLeftOrRightOf(containerRef.current.getBoundingClientRect(), 0)}
        >
            <IconizedContextMenuOptionList>
                { deviceOptions }
            </IconizedContextMenuOptionList>
        </IconizedContextMenu>
        : null;

    return {
        deviceLabel: state.device?.label || _t("Default Device"),
        devicesMenu,
        onSelectDeviceClick,
    };
};
