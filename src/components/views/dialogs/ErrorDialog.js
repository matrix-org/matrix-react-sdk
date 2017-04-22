/*
Copyright 2015, 2016 OpenMarket Ltd

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

/*
 * Usage:
 * Modal.createDialog(ErrorDialog, {
 *   title: "some text", (default: "Error")
 *   description: "some more text",
 *   button: "Button Text",
 *   onFinished: someFunction,
 *   focus: true|false (default: true)
 * });
 */

import React from 'react';
import sdk from '../../../index';
import dis from '../../../dispatcher';

export default React.createClass({
    displayName: 'ErrorDialog',
    propTypes: {
        title: React.PropTypes.string,
        description: React.PropTypes.oneOfType([
            React.PropTypes.element,
            React.PropTypes.string,
        ]),
        button: React.PropTypes.string,
        focus: React.PropTypes.bool,
        onFinished: React.PropTypes.func.isRequired,
        focusComposer: React.PropTypes.boolean,
    },

    getDefaultProps: function() {
        return {
            title: "Error",
            description: "An error has occurred.",
            button: "OK",
            focus: true,
        };
    },

    onFinished: function() {
        this.props.onFinished();
        if (this.props.focusComposer) {
            dis.dispatch({action: 'focus_composer'});
        }
    },

    render: function() {
        const BaseDialog = sdk.getComponent('views.dialogs.BaseDialog');
        return (
            <BaseDialog className="mx_ErrorDialog" onFinished={this.props.onFinished}
                    title={this.props.title}>
                <div className="mx_Dialog_content">
                    {this.props.description}
                </div>
                <div className="mx_Dialog_buttons">
                    <button className="mx_Dialog_primary" onClick={this.onFinished} autoFocus={this.props.focus}>
                        {this.props.button}
                    </button>
                </div>
            </BaseDialog>
        );
    },
});
