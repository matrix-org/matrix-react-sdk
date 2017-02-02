/*
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

import React from 'react';
import classnames from 'classnames';
import AccessibleButton from './AccessibleButton';

const MenuOption = (props) => {
    const onKeyUp = (ev) => {
        console.log(ev);
    };

    return <div key={props.dropdown_key} className="mx_Dropdown_option"
        onClick={props.onClick} onKeyUp={onKeyUp}
    >
        {props.children}
    </div>
};

/*
 * Reusable dropdown select control, akin to react-select,
 * but somewhat simpler as react-select is 79KB of minified
 * javascript.
 *
 * TODO: Port NetworkDropdown to use this.
 */
export default class Dropdown extends React.Component {
    constructor(props) {
        super(props);

        this.dropdownRootElement = null;
        this.ignoreEvent = null;

        this._onInputClick = this._onInputClick.bind(this);
        this._onRootClick = this._onRootClick.bind(this);
        this._onDocumentClick = this._onDocumentClick.bind(this);
        this._onMenuOptionClick = this._onMenuOptionClick.bind(this);
        this._onInputKeyUp = this._onInputKeyUp.bind(this);
        this._collectRoot = this._collectRoot.bind(this);
        this._collectInputTextBox = this._collectInputTextBox.bind(this);

        this.inputTextBox = null;

        this._reindexChildren();

        this.state = {
            // True if the menu is dropped-down
            expanded: false,
            // The key of the selected option
            selectedOption: props.children[0].key,
        };
    }

    componentWillMount() {
        // Listen for all clicks on the document so we can close the
        // menu when the user clicks somewhere else
        document.addEventListener('click', this._onDocumentClick, false);

        // fire this now so the defaults can be set up
        this.props.onOptionChange();
    }

    componentWillUnmount() {
        document.removeEventListener('click', this._onDocumentClick, false);
    }

    componentWillReceiveProps() {
        this._reindexChildren();
    }

    _reindexChildren() {
        this.childrenByKey = {};
        for (const child of this.props.children) {
            this.childrenByKey[child.key] = child;
        }
    }

    _onDocumentClick(ev) {
        // Close the dropdown if the user clicks anywhere that isn't
        // within our root element
        if (ev !== this.ignoreEvent) {
            this.setState({
                expanded: false,
            });
        }
    }

    _onRootClick(ev) {
        // This captures any clicks that happen within our elements,
        // such that we can then ignore them when they're seen by the
        // click listener on the document handler, ie. not close the
        // dropdown immediately after opening it.
        // NB. We can't just stopPropagation() because then the event
        // doesn't reach the React onClick().
        this.ignoreEvent = ev;
    }

    _onInputClick(ev) {
        this.setState({
            expanded: !this.state.expanded,
        });
        ev.preventDefault();
    }

    _onMenuOptionClick(server, instance) {
        this.setState({
            expanded: false,
            selectedOptionIndex: server,
        });
        this.props.onOptionChange(server, );
    }

    _onInputKeyUp(e) {
        if (e.key == 'Enter') {
            this.setState({
                expanded: false,
                selectedServer: e.target.value,
            });
            this.props.onOptionChange(e.target.value, null);
        }
    }

    _collectRoot(e) {
        if (this.dropdownRootElement) {
            this.dropdownRootElement.removeEventListener(
                'click', this._onRootClick, false,
            );
        }
        if (e) {
            e.addEventListener('click', this._onRootClick, false);
        }
        this.dropdownRootElement = e;
    }

    _collectInputTextBox(e) {
        this.inputTextBox = e;
        if (e) e.focus();
    }

    _getMenuOptions() {
        return this.props.children.map((child) => {
            return <MenuOption key={child.key}>
                {child}
            </MenuOption>
        });
    }

    render() {
        let currentValue;

        const menuStyle = {};
        if (this.props.menuWidth) menuStyle.width = this.props.menuWidth;

        let menu;
        if (this.state.expanded) {
            currentValue = <input type="text" className="mx_Dropdown_option"
                ref={this._collectInputTextBox} onKeyUp={this._onInputKeyUp}
            />;
        } else {
            // we render the menu in any case and hide it when invisible
            // as otherwise it takes quite a long time to open, so we
            // take the rendering hit when we load the register screen.
            menuStyle.display = 'none';

            const selectedChild = this.props.getShortOption ?
                this.props.getShortOption(this.state.selectedOption) :
                this.childrenByKey[this.state.selectedOption];
            currentValue = <div className="mx_Dropdown_option">
                {selectedChild}
            </div>
        }

        const menuOptions = this._getMenuOptions();
        menu = <div className="mx_Dropdown_menu" style={menuStyle}>
            {this._getMenuOptions()}
        </div>;

        const dropdownClasses = {
            mx_Dropdown: true,
        };
        if (this.props.className) {
            dropdownClasses[this.props.className] = true;
        }

        return <div className={classnames(dropdownClasses)} ref={this._collectRoot}>
            <AccessibleButton className="mx_Dropdown_input" onClick={this._onInputClick}>
                {currentValue}
                <span className="mx_Dropdown_arrow"></span>
                {menu}
            </AccessibleButton>
        </div>;
    }
}

Dropdown.propTypes = {
    // The width that the dropdown should be. If specified,
    // the dropped-down part of the menu will be set to this
    // width.
    menuWidth: React.PropTypes.number,
    // Called when the selected option changes
    onOptionChange: React.PropTypes.func.isRequired,
    // Function that, given the key of an option, returns
    // a node representing that option to be displayed in the
    // box itself as the currently-selected option (ie. as
    // opposed to in the actual dropped-down part). If
    // unspecified, the appropriate child element is used as
    // in the dropped-down menu.
    getShortOption: React.PropTypes.func,
}
