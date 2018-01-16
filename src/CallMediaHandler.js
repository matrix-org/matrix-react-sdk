/*
 Copyright 2017 Michael Telatynski <7t3chguy@gmail.com>

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

import * as Matrix from 'matrix-js-sdk';
import SettingsStore, {SettingLevel} from "./settings/SettingsStore";

export default {
    getDevices: function() {
        // Only needed for Electron atm, though should work in modern browsers
        // once permission has been granted to the webapp
        return navigator.mediaDevices.enumerateDevices().then(function(devices) {
            const audioIn = [];
            const videoIn = [];

            if (devices.some((device) => !device.label)) return false;

            devices.forEach((device) => {
                switch (device.kind) {
                    case 'audioinput': audioIn.push(device); break;
                    case 'videoinput': videoIn.push(device); break;
                }
            });

            // console.log("Loaded WebRTC Devices", mediaDevices);
            return {
                audioinput: audioIn,
                videoinput: videoIn,
            };
        }, (error) => { console.log('Unable to refresh WebRTC Devices: ', error); });
    },

    loadDevices: function() {
        const audioDeviceId = SettingsStore.getValue("webrtc_audioinput");
        const videoDeviceId = SettingsStore.getValue("webrtc_videoinput");

        Matrix.setMatrixCallAudioInput(audioDeviceId);
        Matrix.setMatrixCallVideoInput(videoDeviceId);
    },

    setAudioInput: function(deviceId) {
        SettingsStore.setValue("webrtc_audioinput", null, SettingLevel.DEVICE, deviceId);
        Matrix.setMatrixCallAudioInput(deviceId);
    },

    setVideoInput: function(deviceId) {
        SettingsStore.setValue("webrtc_videoinput", null, SettingLevel.DEVICE, deviceId);
        Matrix.setMatrixCallVideoInput(deviceId);
    },
};
