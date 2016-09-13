/*
Copyright 2016 OpenMarket Ltd

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

//import {getAddressType, inviteToRoom} from '../../../Invite';
import MultiInviter from '../../../utils/MultiInviter';
import sdk from '../../../index';

export default class MultiInviteDialog extends React.Component {
    constructor(props, context) {
        super(props, context);

        this.inviter = new MultiInviter(this.props.roomId);

        this._onCancel = this._onCancel.bind(this);
        this._startInviting = this._startInviting.bind(this);
        this._onProgress = this._onProgress.bind(this);

        this.state = {
            busy: false,
            done: false,
            completionStates: {},
        };
    }

    componentWillUnmount() {
        this.inviter.cancel();
    }

    _onCancel() {
        this.inviter.cancel();
        this.props.onFinished(false);
    }

    _startInviting() {
        this.setState({
            busy: true,
            done: false,
        });
        this.inviter.invite(this.props.inputs).progress(this._onProgress).done(() => {
            this.setState({
                busy: false,
                done: true,
            });
        });
    }

    _onProgress(completionStates) {
        this.setState({
            completionStates
        });
    }

    _getProgressIndicator() {
        let numErrors = 0;
        for (const addr of this.props.inputs) {
            if (this.inviter.getCompletionState(addr) == 'error') {
                ++numErrors;
            }
        }
        let errorText;
        if (numErrors > 0) {
            const plural = numErrors > 1 ? 's' : '';
            errorText = <span className="error">({numErrors} error{plural})</span>
        }
        return <span>
            {Object.keys(this.state.completionStates).length} / {this.props.inputs.length} {errorText}
        </span>;
    }

    render() {
        const Spinner = sdk.getComponent("elements.Spinner");
        const inviteTiles = [];

        for (let i = 0; i < this.props.inputs.length; ++i) {
            const input = this.props.inputs[i];
            let statusClass = '';
            let statusElement;
            if (this.state.completionStates[input] == 'error') {
                statusClass = 'error';
                statusElement = <p className="mx_MultiInviteDialog_statusText">
                {this.inviter.getErrorText(input)}
                </p>;
            } else if (this.state.completionStates[input] == 'invited') {
                statusClass = 'invited';
            }
            inviteTiles.push(
                <li key={i}>
                    <p className={statusClass}>{input}</p>
                    {statusElement}
                </li>
            );
        }

        let controls = [];
        if (this.state.busy) {
            controls.push(<Spinner key="spinner" />);
            controls.push(<button key="cancel" onClick={this._onCancel}>Cancel</button>);
            controls.push(<span key="progr">{this._getProgressIndicator()}</span>);
        } else if (this.state.done) {
            controls.push(
                <button
                    key="cancel"
                    className="mx_Dialog_primary"
                    onClick={this._onCancel}
                >Done</button>
            );
            controls.push(<span key="progr">{this._getProgressIndicator()}</span>);
        } else {
            controls.push(
                <button
                    key="invite"
                    onClick={this._startInviting}
                    autoFocus={true}
                    className="mx_Dialog_primary"
                >
                Invite
            </button>);
            controls.push(<button key="cancel" onClick={this._onCancel}>Cancel</button>);
        }

        return (
            <div className="mx_MultiInviteDialog">
                <div className="mx_Dialog_title">
                    Inviting {this.props.inputs.length} People
                </div>
                <div className="mx_Dialog_content">
                    <ul>
                        {inviteTiles}
                    </ul>
                </div>
                <div className="mx_Dialog_buttons">
                    {controls}
                </div>
            </div>
        );
    }
}

MultiInviteDialog.propTypes = {
    onFinished: React.PropTypes.func.isRequired,
    inputs: React.PropTypes.array.isRequired,
    roomId: React.PropTypes.string.isRequired,
};
