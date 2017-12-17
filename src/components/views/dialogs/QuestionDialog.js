/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 New Vector Ltd.

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
import sdk from '../../../index';
import { _t } from '../../../languageHandler';
import classnames from 'classnames';

export default React.createClass({
    displayName: 'QuestionDialog',
    propTypes: {
        title: React.PropTypes.string,
        description: React.PropTypes.node,
        extraButtons: React.PropTypes.node,
        button: React.PropTypes.string,
        danger: React.PropTypes.bool,
        focus: React.PropTypes.bool,
        onFinished: React.PropTypes.func.isRequired,
    },

    getDefaultProps: function() {
        return {
            title: "",
            description: "",
            extraButtons: null,
            focus: true,
            hasCancelButton: true,
            danger: false,
        };
    },

    onOk: function() {
        this.props.onFinished(true);
    },

    onCancel: function() {
        this.props.onFinished(false);
    },

    render: function() {
        const BaseDialog = sdk.getComponent('views.dialogs.BaseDialog');
        const cancelButton = this.props.hasCancelButton ? (
            <button onClick={this.onCancel}>
                { _t("Cancel") }
            </button>
        ) : null;
        const buttonClasses = classnames({
            mx_Dialog_primary: true,
            danger: this.props.danger,
        });
        return (
            <BaseDialog className="mx_QuestionDialog" onFinished={this.props.onFinished}
                onEnterPressed={this.onOk}
                title={this.props.title}
            >
                <div className="mx_Dialog_content">
                    { this.props.description }
                </div>
                <div className="mx_Dialog_buttons">
                    <button className={buttonClasses} onClick={this.onOk} autoFocus={this.props.focus}>
                        { this.props.button || _t('OK') }
                    </button>
                    { this.props.extraButtons }
                    { cancelButton }
                </div>
            </BaseDialog>
        );
    },
});
