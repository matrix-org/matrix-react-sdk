/*
Copyright 2017 Marcel Radzio (MTRNord)
Copyright 2017 Vector Creations Ltd.

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
import PropTypes from 'prop-types';

export default class OauthButton extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            searchQuery: '',
            langs: null,
        };
    }

    render() {
        return <div className="mx_ButtonRow">
            <a href="#/oauth"
               className="mx_ButtonParent mx_ButtonFullWidth mx_ButtonOAuth mx_Button_iconSignIn"
            >
                <div className="mx_ButtonLabel">OAuth</div>
            </a>
        </div>;
    }
}

OauthButton.propTypes = {
    className: PropTypes.string,
    onOptionChange: PropTypes.func.isRequired,
    value: PropTypes.string,
};
