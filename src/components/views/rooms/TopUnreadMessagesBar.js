/*
Copyright 2016 OpenMarket Ltd
Copyright 2017 Vector Creations Ltd

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

'use strict';

const React = require('react');
import PropTypes from 'prop-types';
import { _t } from '../../../languageHandler';
import AccessibleButton from '../elements/AccessibleButton';
import {formatCount} from '../../../utils/FormattingUtils';

const sdk = require('../../../index');

module.exports = React.createClass({
    displayName: 'TopUnreadMessagesBar',

    propTypes: {
        onScrollUpClick: PropTypes.func,
    },

    render: function() {
        let badgeLabel = "?";
        const count = this.props.messageCount;
        if (count) {
            if (count.exact) {
                badgeLabel = formatCount(this.props.messageCount.exact);
            } else if (count.atLeast) {
                badgeLabel = `+${formatCount(this.props.messageCount.atLeast)}`;
            }
        }
        return (
            <div className="mx_TopUnreadMessagesBar">
                <AccessibleButton className="mx_TopUnreadMessagesBar_scrollUp"
                    title={_t('Jump to first unread message.')}
                    onClick={this.props.onScrollUpClick}>
                    <div className="mx_TopUnreadMessagesBar_badgeContainer">
                        <div className="mx_TopUnreadMessagesBar_badge">{badgeLabel}</div>
                    </div>
                </AccessibleButton>
            </div>
        );
    },
});
