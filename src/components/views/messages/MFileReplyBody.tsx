/*
Copyright 2020-2021 Tulir Asokan <tulir@maunium.net>

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
import MFileBody from "./MFileBody";
import { _t } from "../../../languageHandler";
import AccessibleButton from "../elements/AccessibleButton";
import { presentableTextForFile } from "../../../utils/FileUtils";

export default class MFileReplyBody extends MFileBody {

    protected onPlaceholderClick = async () => {
        return;
    }

    render() {
        const contentUrl = this.getContentUrl();
        if (contentUrl) {
            return (
                <span className="mx_MFileBody">
                    <AccessibleButton className="mx_MediaBody mx_MFileBody_info" onClick={this.onPlaceholderClick}>
                        <span className="mx_MFileBody_info_icon" />
                        <span className="mx_MFileBody_info_filename">
                            { presentableTextForFile(this.content, _t("Attachment"), true, true) }
                        </span>
                    </AccessibleButton>
                </span>
            );
        } else {
            const extra = this.linkText ? (': ' + this.linkText) : '';
            return (
                <span className="mx_MFileBody">
                    <span className="mx_MFileBody_info_icon" />
                    { _t("Invalid file%(extra)s", { extra: extra }) }
                </span>
            );
        }
    }
}
