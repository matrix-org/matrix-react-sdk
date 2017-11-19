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
import {_td} from "../../../languageHandler";
import {TabbedView, Tab} from "../../structures/TabbedView";
import GeneralUserSettingsPanel from "../../structures/settings/user/GeneralUserSettingsPanel";

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
        return (
            <div className={"mx_FieldCommitment mx_FieldCommitment_attach_" + this.props.atttachment}>
                Unsaved changes
                <button onClick={this.props.onCommit}>Commit</button>
                <button onClick={this.props.onRevert}>Revert</button>
            </div>
        );
    },
});
