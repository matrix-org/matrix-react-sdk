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

import React from 'react';
import BaseDialog from './BaseDialog';
import AccessibleButton from "../elements/AccessibleButton";
import { _t } from '../../../languageHandler';

/*
 * A dialog for confirming a Direct Message.
 */

export default class ConfirmDirectMessageDialog extends React.Component {
    render() {
        return (
            <BaseDialog
            title={this.props.title || _t("Confirm Message")}
            className="mx_ConfirmDirectMessageDialog"
            contentId="mx_ConfirmDirectMessageDialog"
            onFinished={this.props.onFinished}
            hasCancel={true}
        >
                <p>
                    {_t("Are you sure you wish to start a direct message with the ") + `${this.props.name}` + " ?"}
                </p>
                <AccessibleButton className="mx_AccessibleButton_kind_primary" kind="primary" onClick={this.props.confirmMessage}>
                    {_t("Continue")}
                </AccessibleButton>
        </BaseDialog>
        );
    }
}
