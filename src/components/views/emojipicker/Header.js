/*
Copyright 2019 Tulir Asokan <tulir@maunium.net>

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
import classnames from 'classnames';

import {MenuItem} from "../../structures/ContextMenu";

class Header extends React.PureComponent {
    static propTypes = {
        categories: PropTypes.arrayOf(PropTypes.object).isRequired,
        onAnchorClick: PropTypes.func.isRequired,
        refs: PropTypes.object,
    };

    render() {
        return (
            <nav className="mx_EmojiPicker_header">
                {this.props.categories.map(category => {
                    const classes = classnames(`mx_EmojiPicker_anchor mx_EmojiPicker_anchor_${category.id}`, {
                        mx_EmojiPicker_anchor_visible: category.visible,
                    });
                    return <MenuItem
                        disabled={!category.enabled}
                        key={category.id}
                        inputRef={category.ref}
                        className={classes}
                        onClick={() => this.props.onAnchorClick(category.id)}
                        label={category.name}
                        title={category.name} />;
                })}
            </nav>
        );
    }
}

export default Header;
