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

import React from 'react';

import { _t } from "../../../languageHandler";
import SplashPage from "../../structures/SplashPage";
import AccessibleButton from "../elements/AccessibleButton";
import { UseCase } from "../../../settings/enums/UseCase";

interface Props {
    onFinished: (useCase: UseCase) => void;
}

export default function UseCaseSelection({ onFinished }: Props) {
    return (
        <SplashPage className="mx_UseCaseSelection">
            <div className="mx_UseCaseSelection_title mx_UseCaseSelection_slideIn">
                <h1>{ _t("You’re in") }</h1>
            </div>
            <div className="mx_UseCaseSelection_info mx_UseCaseSelection_slideInDelayed">
                <h2>{ _t("Who will you chat to the most?") }</h2>
                <h4>{ _t("We’ll help you get connected.") }</h4>
            </div>
            <div className="mx_UseCaseSelection_options mx_UseCaseSelection_slideInDelayed">
                <AccessibleButton className="mx_UseCaseSelection_option" onClick={() => onFinished(UseCase.PersonalMessaging)}>
                    <div className="mx_UseCaseSelection_icon mx_UseCaseSelection_icon_messaging" />
                    <span>{ _t("Friends and family") }</span>
                </AccessibleButton>
                <AccessibleButton className="mx_UseCaseSelection_option" onClick={() => onFinished(UseCase.WorkMessaging)}>
                    <div className="mx_UseCaseSelection_icon mx_UseCaseSelection_icon_work" />
                    <span>{ _t("Coworkers and teams") }</span>
                </AccessibleButton>
                <AccessibleButton className="mx_UseCaseSelection_option" onClick={() => onFinished(UseCase.CommunityMessaging)}>
                    <div className="mx_UseCaseSelection_icon mx_UseCaseSelection_icon_community" />
                    <span>{ _t("Online community members") }</span>
                </AccessibleButton>
            </div>
            <div className="mx_UseCaseSelection_skip mx_UseCaseSelection_slideInDelayed">
                <AccessibleButton kind="link" onClick={() => onFinished(UseCase.Skip)}>
                    { _t("Skip") }
                </AccessibleButton>
            </div>
        </SplashPage>
    );
}
