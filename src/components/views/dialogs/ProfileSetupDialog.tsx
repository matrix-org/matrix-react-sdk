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

import { logger } from "matrix-js-sdk/src/logger";
import { Visibility } from "matrix-js-sdk/src/matrix";
import React, { FC, Fragment, useCallback, useEffect, useRef, useState } from "react";

import { Icon as HideIcon } from "../../../../res/img/element-icons/hide.svg";
import { Icon as GlobeIcon } from "../../../../res/img/globe.svg";
import { useEventEmitter } from "../../../hooks/useEventEmitter";
import { _t } from "../../../languageHandler";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import SettingsStore from "../../../settings/SettingsStore";
import { UIFeature } from "../../../settings/UIFeature";
import { UPDATE_EVENT } from "../../../stores/AsyncStore";
import { OwnProfileStore } from "../../../stores/OwnProfileStore";
import { getDefaultIdentityServerUrl } from "../../../utils/IdentityServerUtils";
import { abbreviateUrl } from "../../../utils/UrlUtils";
import BaseAvatar from "../avatars/BaseAvatar";
import AccessibleButton, { ButtonEvent } from "../elements/AccessibleButton";
import DialogButtons from "../elements/DialogButtons";
import Field from "../elements/Field";
import MiniAvatarUploader, { AVATAR_SIZE } from "../elements/MiniAvatarUploader";
import { ProfileDiscoveryForm } from "../elements/ProfileDiscoveryForm";
import StyledRadioGroup, { IDefinition } from "../elements/StyledRadioGroup";
import Heading from "../typography/Heading";
import BaseDialog from "./BaseDialog";
import { IDialogProps } from "./IDialogProps";

const profileTypes: IDefinition<Visibility>[] = [
    {
        value: Visibility.Private,
        label: (
            <Fragment>
                <span className="mx_ProfileSetupDialog_optionTitle">
                    <HideIcon className="mx_ProfileSetupDialog_optionIcon" />
                    { _t("Private") }
                </span>
                <span className="mx_ProfileSetupDialog_optionDescription">
                    { _t("No one can find you") }
                </span>
            </Fragment>
        ),
    },
    {
        value: Visibility.Public,
        label: (
            <Fragment>
                <span className="mx_ProfileSetupDialog_optionTitle">
                    <GlobeIcon className="mx_ProfileSetupDialog_optionIcon" />
                    { _t("Public") }
                </span>
                <span className="mx_ProfileSetupDialog_optionDescription">
                    { _t("People with your email and number can find you") }
                </span>
            </Fragment>
        ),
    },
];

const getOwnProfile = (userId: string) => ({
    displayName: OwnProfileStore.instance.displayName || userId,
    avatarUrl: OwnProfileStore.instance.getHttpAvatarUrl(AVATAR_SIZE),
});

export const ProfileSetupDialog: FC<IDialogProps> = ({ onFinished }: IDialogProps) => {
    const cli = MatrixClientPeg.get();
    const userId = cli.getUserId();
    const [ownProfile, setOwnProfile] = useState(getOwnProfile(userId));
    useEventEmitter(OwnProfileStore.instance, UPDATE_EVENT, () => {
        setOwnProfile(getOwnProfile(userId));
    });

    const [displayName, setDisplayName] = useState<string>(ownProfile.displayName);

    const defaultIdentityServer = getDefaultIdentityServerUrl() && abbreviateUrl(getDefaultIdentityServerUrl());
    const originalIdentityServer = cli.getIdentityServerUrl();
    const [identityServer, setIdentityServer] = useState<string>(originalIdentityServer ?? defaultIdentityServer);
    const originalProfileType = originalIdentityServer ? Visibility.Public : Visibility.Private;
    const [profileType, setProfileType] = useState<Visibility>(originalProfileType);
    useEffect(
        () => setProfileType(originalProfileType),
        [originalProfileType],
    );

    const onSubmit = useCallback((e: ButtonEvent) => {
        e.stopPropagation();
        e.preventDefault();

        if (displayName !== ownProfile.displayName) {
            logger.info(`Updating displayName from ${ownProfile.displayName} to ${displayName}`);
            cli.setDisplayName(displayName).catch(e => {
                console.error(`Error setting display name to ${displayName}:`, e);
            });
        }

        // Update visibility and identity server
        const identityServerUrl = profileType === Visibility.Public ? identityServer : null;
        if (originalIdentityServer !== identityServerUrl) {
            logger.info(`Updating identityServer from ${originalIdentityServer} to ${identityServerUrl}`);
            cli.setIdentityServerUrl(identityServer);
            cli.setAccountData("m.identity_server", {
                base_url: identityServerUrl,
            }).catch(e => {
                console.error(`Error setting identity server to ${identityServerUrl}:`, e);
            });
        }

        onFinished();
    }, [displayName, ownProfile.displayName, profileType, identityServer, originalIdentityServer, onFinished, cli]);

    const uploadRef = useRef<HTMLInputElement>();

    return (
        <BaseDialog
            title={_t("Complete your profile")}
            className="mx_ProfileSetupDialog"
            onFinished={onFinished}
            fixedWidth={false}>
            <form
                onSubmit={onSubmit}
                autoComplete="off"
                noValidate={true}
                className="mx_ProfileSetupDialog_header"
            >
                <MiniAvatarUploader
                    uploadRef={uploadRef}
                    hasAvatar={!!ownProfile.avatarUrl}
                    setAvatarUrl={url => cli.setAvatarUrl(url)}
                    isUserAvatar
                >
                    <BaseAvatar
                        idName={userId}
                        name={ownProfile.displayName}
                        url={ownProfile.avatarUrl}
                        width={76}
                        height={76}
                        resizeMethod="crop"
                    />
                </MiniAvatarUploader>
                <div className="mx_ProfileSetupDialog_name">
                    <Field
                        label={_t("Display Name")}
                        type="text"
                        value={displayName}
                        autoComplete="off"
                        onChange={({ target: { value } }) => setDisplayName(value)}
                    />
                    <div className="mx_ProfileSetupDialog_id">{ userId }</div>
                </div>
            </form>
            <div className="mx_ProfileSetupDialog_tip">
                <Heading size="h4">
                    { _t("Pro tip") }
                </Heading>
                <div>
                    { _t("Add a profile photo so people will recognise you.") }<br />
                    { _t("You can change this anytime.") }
                </div>
                <AccessibleButton kind="primary" onClick={() => uploadRef.current?.click()}>
                    { _t("Add photo") }
                </AccessibleButton>
            </div>
            { SettingsStore.getValue(UIFeature.IdentityServer) && (
                <Fragment>
                    <Heading size="h4">
                        { _t("Profile type") }
                    </Heading>
                    <StyledRadioGroup
                        name="profileType"
                        definitions={profileTypes}
                        value={profileType}
                        onChange={value => setProfileType(value)}
                    />
                    { profileType === Visibility.Public && (
                        <ProfileDiscoveryForm
                            identityServer={identityServer}
                            onIdentityServerChange={setIdentityServer}
                        />
                    ) }
                </Fragment>
            ) }
            <DialogButtons
                primaryIsSubmit={true}
                primaryButton={_t("Save")}
                onPrimaryButtonClick={onSubmit}
                onCancel={onFinished}
            />
        </BaseDialog>
    );
};
