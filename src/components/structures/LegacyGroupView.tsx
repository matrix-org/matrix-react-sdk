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

import * as React from "react";

import AutoHideScrollbar from './AutoHideScrollbar';
import { _t } from "../../languageHandler";
import AccessibleButton from "../views/elements/AccessibleButton";

interface IProps {
    groupId: string;
}

const onCreateSpace = () => {
    // TODO: @@TR CREATE
    console.log("TODO: Create space");
};

const LegacyGroupView: React.FC<IProps> = ({ groupId }) => {
    // XXX: Stealing classes from the HomePage component for CSS simplicity.
    return <AutoHideScrollbar className="mx_HomePage mx_HomePage_default">
        <div className="mx_HomePage_default_wrapper">
            <h1>{ _t("Communities are now Spaces") }</h1>
            <h2>{ _t("Sorry, %(groupId)s is inaccessible", { groupId }) }</h2>
            <p>{ _t("<a1>Create your Space</a1> to organize your rooms, and visit <a2>our blog</a2> for more information", {}, {
                a1: (sub) => <AccessibleButton onClick={onCreateSpace} kind="link_inline">{ sub }</AccessibleButton>,
                a2: (sub) => <a href="https://example.org" rel="noreferrer noopener" target="_blank">{ sub }</a>,
            }) }</p>
        </div>
    </AutoHideScrollbar>;
};

export default LegacyGroupView;
