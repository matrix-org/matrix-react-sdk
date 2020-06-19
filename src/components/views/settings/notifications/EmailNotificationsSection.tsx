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

import React, {useContext, useEffect, useState} from "react";
import {MatrixClient} from "matrix-js-sdk/src/client";

import SettingsSection from "../SettingsSection";
import {_t} from "../../../../languageHandler";
import {useAsyncMemo} from "../../../../hooks/useAsyncMemo";
import MatrixClientContext from "../../../../contexts/MatrixClientContext";
import StyledCheckbox from "../../elements/StyledCheckbox";
import Spinner from "../../elements/Spinner";
import SdkConfig from "../../../../SdkConfig";
import AccessibleButton from "../../elements/AccessibleButton";
import {OpenToTabPayload} from "../../../../dispatcher/payloads/OpenToTabPayload";
import {Action} from "../../../../dispatcher/actions";
import defaultDispatcher from "../../../../dispatcher/dispatcher";
import {USER_GENERAL_TAB} from "../../dialogs/UserSettingsDialog";

const MEDIUM = "email";

interface IPusher {
    kind: "email" | string;
    pushkey: string;
    app_id: string;
    app_display_name: string;
    device_display_name: string;
    lang: string;
    data: {
        brand: string;
    };
    append?: boolean;
}

const goToGeneralSettings = () => {
    defaultDispatcher.dispatch<OpenToTabPayload>({
        action: Action.ViewUserSettings,
        initialTabId: USER_GENERAL_TAB,
    });
};

const enablePusher = (cli: MatrixClient, email: string) => {
    const pusher: IPusher = {
        kind: "email",
        app_id: "m.email",
        pushkey: email,
        app_display_name: "Email Notifications",
        device_display_name: email,
        lang: navigator.language,
        data: {
            brand: SdkConfig.get().brand || "Riot",
        },
        // We always append for email pushers since we don't want to
        // stop other accounts notifying to the same email address
        append: true,
    };
    cli.setPusher(pusher);
    return pusher;
};

const disablePusher = (cli: MatrixClient, pusher: IPusher) => {
    if (!pusher) return;
    pusher.kind = null;
    cli.setPusher(pusher);
};

const EmailNotificationsSection: React.FC = () => {
    const cli = useContext<MatrixClient>(MatrixClientContext);
    // TODO use sets
    const emails = useAsyncMemo<string[]>(() => {
        return cli.getThreePids().then(r => r.threepids.filter(t => t.medium === MEDIUM).map(t => t.address));
    }, [cli]);
    // enabled emails has to be state so we can update it from two sources
    const [pushers, setPushers] = useState<IPusher[]>(null);
    useEffect(() => {
        cli.getPushers().then(r => r.pushers.filter(p => p.kind === MEDIUM)).then(setPushers);
    }, [cli]);

    const [enabled, setEnabled] = useState<boolean>(null);
    const onEnableChange = ev => {
        setEnabled(ev.target.checked);
        pushers.forEach(p => disablePusher(cli, p));
    };

    const onTogglePusher = (e, email) => {
        const checked = e.target.checked;
        if (checked) {
            const pusher = enablePusher(cli, email);
            setPushers(ps => Array.from(new Set([...ps, pusher])));
        } else {
            const pusher = pushers.find(p => p.pushkey === email);
            disablePusher(cli, pusher);
            setPushers(ps => ps.filter(p => p !== pusher));
        }
    };

    const effectivelyEnabled = Boolean(enabled !== null ? enabled : pushers && pushers.length > 0);

    let emailsSection;
    if (emails && pushers) {
        // add emails from pushers too in case we no longer have the 3pid registered but only the pusher
        const allEmails = Array.from(new Set([...emails, ...pushers.map(p => p.pushkey)])).sort();
        emailsSection = <div className="mx_NotificationsTab_emailAddresses">
            {allEmails.map(email => {
                return <StyledCheckbox
                    key={email}
                    disabled={!effectivelyEnabled}
                    checked={!!pushers.find(p => p.pushkey === email)}
                    onChange={e => onTogglePusher(e, email)}
                >
                    {email}
                </StyledCheckbox>;
            })}
        </div>;
    } else {
        emailsSection = <Spinner />;
    }

    let microCopy;
    if (emails && pushers && (emails.length || pushers.length)) {
        microCopy = _t("Select which emails you want to send summaries to. Manage your emails in <a>General</a>.", {}, {
            a: sub => <AccessibleButton kind="link" onClick={goToGeneralSettings}>{sub}</AccessibleButton>,
        });
    } else {
        microCopy = _t("Set your email account in <a>General settings</a>.", {}, {
            a: sub => <AccessibleButton kind="link" onClick={goToGeneralSettings}>{sub}</AccessibleButton>,
        });
    }

    return <SettingsSection title={_t("Email summary")}>
        <StyledCheckbox checked={effectivelyEnabled} onChange={onEnableChange}>
            {_t("Receive an email summary of missed notifications")}
        </StyledCheckbox>
        <div className="mx_Checkbox_microCopy">
            {microCopy}
        </div>
        { emailsSection }
    </SettingsSection>;
};

export default EmailNotificationsSection;
