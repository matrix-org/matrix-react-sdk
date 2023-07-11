/*
Copyright 2020 The Matrix.org Foundation C.I.C.

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

import React from "react";

import QRCode from "../QRCode";

interface IProps {
    /** The data for the QR code. If `undefined`, a spinner is shown. */
    qrCodeBytes: undefined | Buffer;
}

export default class VerificationQRCode extends React.PureComponent<IProps> {
    public render(): React.ReactNode {
        return (
            <QRCode
                data={this.props.qrCodeBytes === undefined ? null : [{ data: this.props.qrCodeBytes, mode: "byte" }]}
                className="mx_VerificationQRCode"
                width={196}
            />
        );
    }
}
