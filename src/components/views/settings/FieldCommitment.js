/*
Copyright 2017 Travis Ralston

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
import {_t} from "../../../languageHandler";

module.exports = React.createClass({
    displayName: 'FieldCommitment',

    propTypes: {
        // Called when the user has committed to the changes
        // Should return a promise to indicate when processing is complete
        onCommit: React.PropTypes.func.isRequired,

        // Called when the user has chosen to revert the changes
        // Should return a promise to indicate when processing is complete
        onRevert: React.PropTypes.func.isRequired,

        // Where the commitment field is being attached
        // Options: left, right, top, bottom
        attachment: React.PropTypes.string.isRequired,
    },

    render: function () {
        // TODO: {Travis} actually use the attachment property (and figure out how to make it generic?)
        // TODO: {Travis} Saving/revert indicator
        return (
            <div className={"mx_FieldCommitment mx_FieldCommitment_attach_" + this.props.attachment}>
                <span className="mx_FieldCommitment_label">{ _t("Unsaved changes") }</span>
                <button className="mx_FieldCommitment_button mx_FieldCommitment_revertButton"
                        onClick={this.props.onRevert}>
                    <img src="img/icon-revert.svg" width="16" height="16" alt={_t("Undo Changes")} />
                </button>
                <button className="mx_FieldCommitment_button mx_FieldCommitment_commitButton"
                        onClick={this.props.onCommit}>
                    <img src="img/icon-checkmark.svg" width="16" height="16" alt={_t("Save Changes")} />
                </button>
            </div>
        );
    },
});
