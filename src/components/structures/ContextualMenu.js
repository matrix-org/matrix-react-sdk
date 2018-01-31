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


'use strict';

const classNames = require('classnames');
const React = require('react');
const ReactDOM = require('react-dom');
import PropTypes from 'prop-types';

// Shamelessly ripped off Modal.js.  There's probably a better way
// of doing reusable widgets like dialog boxes & menus where we go and
// pass in a custom control as the actual body.

module.exports = {
    ContextualMenuContainerId: "mx_ContextualMenu_Container",

    propTypes: {
        menuWidth: PropTypes.number,
        menuHeight: PropTypes.number,
        chevronOffset: PropTypes.number,
        menuColour: PropTypes.string,
        chevronFace: PropTypes.string, // top, bottom, left, right
    },

    getOrCreateContainer: function() {
        let container = document.getElementById(this.ContextualMenuContainerId);
        if (!container) {
            container = document.createElement("div");
            container.id = this.ContextualMenuContainerId;
            document.body.appendChild(container);
        }

        return container;
    },

    afterRender: function() {
      // Logic to correctly position the menu if the window is too small and
      // the menu would normally be out of the window
      let container = document.getElementById(this.ContextualMenuContainerId);
      let wrapper = container.getElementsByClassName(
        'mx_ContextualMenu_wrapper')[0];
      let menu = container.getElementsByClassName(
        'mx_ContextualMenu')[0];
      let menuNode = ReactDOM.findDOMNode(menu);
      let DOMRect = menuNode.getBoundingClientRect();
      let [width, height] = [DOMRect.width, DOMRect.height];

      let overflowX = this.positionX + width > window.innerWidth;
      let overflowY = this.positionY + height > window.innerHeight;

      console.log(width, height, this.positionX, this.positionY, overflowX, overflowY);

      if(overflowX) {
        this.positionX = this.positionX - width - 20;
        wrapper.style.left = this.positionX+'px';
      }

      if(overflowY) {
        this.positionY = this.positionY - height + 30;
        wrapper.style.top = this.positionY+'px';
      }

      console.log(width, height, this.positionX, this.positionY, overflowX, overflowY);
    },

    createMenu: function(Element, props) {
        const self = this;

        const closeMenu = function() {
            ReactDOM.unmountComponentAtNode(self.getOrCreateContainer());

            if (props && props.onFinished) {
                props.onFinished.apply(null, arguments);
            }
        };

        let position = {};
        // Calculate absolute Y position of component
        this.positionY = position.top = props.top ?
          props.top :
          window.innerHeight - props.bottom;

        // Calculate absolute X position of component
        this.positionX = position.left = props.left ?
          props.left :
          window.innerWidth - props.right;

        let chevronFace = props.left ? 'left' : 'right';

        const chevronOffset = {};
        if (props.chevronFace) {
            chevronFace = props.chevronFace;
        }
        if (chevronFace === 'top' || chevronFace === 'bottom') {
            chevronOffset.left = props.chevronOffset;
        } else {
            chevronOffset.top = props.chevronOffset;
        }

        // To override the default chevron colour, if it's been set
        let chevronCSS = "";
        if (props.menuColour) {
            chevronCSS = `
                .mx_ContextualMenu_chevron_left:after {
                    border-right-color: ${props.menuColour};
                }
                .mx_ContextualMenu_chevron_right:after {
                    border-left-color: ${props.menuColour};
                }
                .mx_ContextualMenu_chevron_top:after {
                    border-left-color: ${props.menuColour};
                }
                .mx_ContextualMenu_chevron_bottom:after {
                    border-left-color: ${props.menuColour};
                }
            `;
        }

        const chevron = <div style={chevronOffset} className={"mx_ContextualMenu_chevron_" + chevronFace}></div>;
        const className = 'mx_ContextualMenu_wrapper';

        const menuClasses = classNames({
            'mx_ContextualMenu': true,
            'mx_ContextualMenu_left': chevronFace === 'left',
            'mx_ContextualMenu_right': chevronFace === 'right',
            'mx_ContextualMenu_top': chevronFace === 'top',
            'mx_ContextualMenu_bottom': chevronFace === 'bottom',
        });

        const menuStyle = {};
        if (props.menuWidth) {
            menuStyle.width = props.menuWidth;
        }

        if (props.menuHeight) {
            menuStyle.height = props.menuHeight;
        }

        if (props.menuColour) {
            menuStyle["backgroundColor"] = props.menuColour;
        }

        // FIXME: If a menu uses getDefaultProps it clobbers the onFinished
        // property set here so you can't close the menu from a button click!
        const menu = (
            <div className={className} style={position}>
                <div className={menuClasses} style={menuStyle}>
                    { chevron }
                    <Element {...props} onFinished={closeMenu} />
                </div>
                <div className="mx_ContextualMenu_background" onClick={closeMenu}></div>
                <style>{ chevronCSS }</style>
            </div>
        );

        let component = ReactDOM.render(
          menu, this.getOrCreateContainer(), this.afterRender.bind(this));

        return {close: closeMenu};
    },
};
