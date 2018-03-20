/*
Copyright 2018 New Vector Ltd.

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

import classNames from 'classnames';
import React from 'react';
import PropTypes from 'prop-types';

let containerId = 1;

export default class PersistentContextualMenu extends React.Component {
    static propTypes = {
        menuWidth: PropTypes.number,
        menuHeight: PropTypes.number,
        chevronOffset: PropTypes.number,
        menuColour: PropTypes.string,
        chevronFace: PropTypes.string, // top, bottom, left, right
        onMenuShouldHide: PropTypes.func,
        visible: PropTypes.bool,
    }

    constructor(props) {
        super(props);
        this.containerId = "mx_PersistentContextualMenu_Container_" + containerId;
        containerId++;
        this.state={
            container: this.getOrCreateContainer(),
            chevronFace: null,
        };

        this.getMenuPosition = this.getMenuPosition.bind(this);
    }

    getOrCreateContainer() {
        let container = document.getElementById(this.containerId);

        if (!container) {
            container = document.createElement("div");
            container.id = this.containerId;
            document.body.appendChild(container);
        }

        return container;
    }

    getMenuPosition() {
        const position = {};
        let chevronFace = '';
        const chevronOffset = {};

        if (this.props.top) {
            position.top = this.props.top;
        } else {
            position.bottom = this.props.bottom;
        }

        if (this.props.left) {
            position.left = this.props.left;
                chevronFace = 'left';
        } else {
            position.right = this.props.right;
            chevronFace = 'right';
        }

        if (this.props.chevronFace) {
            chevronFace = this.props.chevronFace;
        }
        if (chevronFace === 'top' || chevronFace === 'bottom') {
            chevronOffset.left = this.props.chevronOffset;
        } else {
            chevronOffset.top = this.props.chevronOffset;
        }
        this.setState({
            chevronFace,
            chevronOffset,
            position,
        });
    }

    onMenuShouldHide() {
        if (this.props.onMenuShouldHide) {
            this.props.onMenuShouldHide();
        }
    }

    getMenuClasses() {
        return classNames({
            'mx_ContextualMenu': true,
            'mx_ContextualMenu_left': this.state.chevronFace === 'left',
            'mx_ContextualMenu_right': this.state.chevronFace === 'right',
            'mx_ContextualMenu_top': this.state.chevronFace === 'top',
            'mx_ContextualMenu_bottom': this.state.chevronFace === 'bottom',
        });
    }

    getMenuStyle() {
        const menuStyle = {};
        // Menu visibility
        if (!this.props.visible) {
            menuStyle['display'] = 'none';
        }

        // Menu size
        if (this.props.menuWidth) {
            menuStyle.width = this.props.menuWidth;
        }

        if (this.props.menuHeight) {
            menuStyle.height = this.props.menuHeight;
        }

        // Additional menu styling
        if (this.props.menuColour) {
            menuStyle["backgroundColor"] = this.props.menuColour;
        }
        if (!isNaN(Number(this.props.menuPaddingTop))) {
            menuStyle["paddingTop"] = this.props.menuPaddingTop;
        }

        return menuStyle;
    }

    // Hide the menu on window resize
    windowResize() {
        this.onMenuShouldHide();
    }

    getChevronCSS() {
        // To override the default chevron colour, if it's been set
        let chevronCSS = "";
        if (this.props.menuColour) {
            chevronCSS = `
                .mx_ContextualMenu_chevron_left:after {
                    border-right-color: ${this.props.menuColour};
                }
                .mx_ContextualMenu_chevron_right:after {
                    border-left-color: ${this.props.menuColour};
                }
                .mx_ContextualMenu_chevron_top:after {
                    border-left-color: ${this.props.menuColour};
                }
                .mx_ContextualMenu_chevron_bottom:after {
                    border-left-color: ${this.props.menuColour};
                }
            `;
        }
        return chevronCSS;
    }

    getChevron() {
        return (
            <div
                style={this.state.chevronOffset}
                className={"mx_ContextualMenu_chevron_" + this.state.chevronFace}
            ></div>);
    }

    render() {
        return (
            <div className={'mx_ContextualMenu_wrapper'} style={this.getMenuPosition()}>
                <div className={this.getMenuClasses()} style={this.getMenuStyle()}>
                    { this.getChevron() }
                    { this.props.children }
                </div>
                <div
                    className="mx_ContextualMenu_background"
                    onClick={(this.props.hideByDefault ? this.hideMenu : this.closeMenu)}
                ></div>
                <style>{ this.getChevronCSS() }</style>
            </div>
        );
    }
}
