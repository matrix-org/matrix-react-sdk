/*
Copyright 2019 New Vector Ltd.

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
import sdk from '../../index';
import dis from '../../dispatcher';
import Modal from '../../Modal';
import { _t } from '../../languageHandler';

const TagPanelButtons = React.createClass({
    displayName: 'TagPanelButtons',


    componentWillMount: function() {
        this._dispatcherRef = dis.register(this._onAction);
    },

    componentWillUnmount() {
        if (this._dispatcherRef) {
            dis.unregister(this._dispatcherRef);
            this._dispatcherRef = null;
        }
    },

    _onAction(payload) {
        if (payload.action === "show_redesign_feedback_dialog") {
            const RedesignFeedbackDialog =
                sdk.getComponent("views.dialogs.RedesignFeedbackDialog");
            Modal.createDialog(RedesignFeedbackDialog);
        }
    },

    render() {
        const GroupsButton = sdk.getComponent('elements.GroupsButton');
        const ActionButton = sdk.getComponent("elements.ActionButton");

        return (<div className="mx_TagPanelButtons">
            <GroupsButton />
            <ActionButton
                className="mx_TagPanelButtons_report" action="show_redesign_feedback_dialog"
                label={_t("Report bugs & give feedback")} tooltip={true} />
        </div>);
    },
});
export default TagPanelButtons;
