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

import * as React from "react";

import Modal from "./Modal";
import QuestionDialog from "./components/views/dialogs/QuestionDialog";
import { _t } from "./languageHandler";
import AccessibleButton from "./components/views/elements/AccessibleButton";
import { doOpenCreateSpace } from "./components/structures/LegacyGroupView";

export function showGroupReplacedWithSpacesDialog(groupId: string) {
    Modal.createTrackedDialog("Groups are now Spaces", '', QuestionDialog, {
        title: _t("Communities are now Spaces"),
        description: <>
            <h2>{ _t("Sorry, %(groupId)s is inaccessible", { groupId }) }</h2>
            <p>{ _t("<a1>Create your Space</a1> to organize your rooms, and visit <a2>our blog</a2> for more information", {}, {
                a1: (sub) => <AccessibleButton onClick={doOpenCreateSpace} kind="link_inline">{ sub }</AccessibleButton>,
                a2: (sub) => <a href="https://example.org" rel="noreferrer noopener" target="_blank">{ sub }</a>,
            }) }</p>
        </>,
        hasCancelButton: false,
    });
}
