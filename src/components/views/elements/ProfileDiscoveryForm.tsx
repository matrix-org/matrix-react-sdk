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

import React, { Fragment, useEffect, useMemo, useState } from "react";
import { ThreepidMedium } from "matrix-js-sdk/src/@types/threepids";

import { _t } from "../../../languageHandler";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import { PartialThreepid } from "../../../models/PartialThreepid";
import EmailAddresses from "../settings/account/EmailAddresses";
import PhoneNumbers from "../settings/account/PhoneNumbers";
import Heading from "../typography/Heading";
import Field from "./Field";
import { useThreePids } from "../../../hooks/useThreePids";

interface Props {
    identityServer: string;
    onIdentityServerChange: (server: string) => void;
}

// TODO: Handle identity server ToS acceptance
export const ProfileDiscoveryForm = ({ identityServer, onIdentityServerChange }: Props) => {
    const cli = MatrixClientPeg.get();

    const threepids = useThreePids(cli);
    const originalEmailAddresses = useMemo(
        () => threepids.filter(threepid => threepid.medium === ThreepidMedium.Email),
        [threepids],
    );
    const originalPhoneNumbers = useMemo(
        () => threepids.filter(threepid => threepid.medium === ThreepidMedium.Phone),
        [threepids],
    );

    const [emailAddresses, setEmailAddresses] = useState<PartialThreepid[]>(originalEmailAddresses);
    const [phoneNumbers, setPhoneNumbers] = useState<PartialThreepid[]>(originalPhoneNumbers);

    useEffect(() => setEmailAddresses(originalEmailAddresses), [originalEmailAddresses]);
    useEffect(() => setPhoneNumbers(originalPhoneNumbers), [originalPhoneNumbers]);

    return (
        <Fragment>
            <div className="mx_ProfileDiscoveryForm">
                <Heading size="h4">
                    { _t("Email addresses") }
                </Heading>
                <EmailAddresses emails={emailAddresses} onEmailsChange={setEmailAddresses} />
                <Heading size="h4">
                    { _t("Phone numbers") }
                </Heading>
                <PhoneNumbers msisdns={phoneNumbers} onMsisdnsChange={setPhoneNumbers} />
                <Field
                    label={_t("Identity server")}
                    type="text"
                    value={identityServer}
                    autoComplete="off"
                    onChange={({ target: { value } }) => onIdentityServerChange(value)}
                />
                <div className="mx_ProfileDiscoveryForm_info">
                    { _t("Identity servers let you discover and be discoverable by existing contacts " +
                        "you know. You can change them in settings anytime.") }
                </div>
            </div>
        </Fragment>
    );
};
