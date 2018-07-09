/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2018 New Vector Ltd

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

module.exports = React.createClass({
    displayName: 'EditableText',

    propTypes: {
        onValueChanged: PropTypes.func,
        initialValue: PropTypes.string,
        label: PropTypes.string,
        placeholder: PropTypes.string,
        className: PropTypes.string,
        labelClassName: PropTypes.string,
        placeholderClassName: PropTypes.string,
        // Overrides blurToSubmit if true
        blurToCancel: PropTypes.bool,
        // Will cause onValueChanged(value, true) to fire on blur
        blurToSubmit: PropTypes.bool,
        editable: PropTypes.bool,
    },

    Phases: {
        Display: "display",
        Edit: "edit",
    },

    getDefaultProps: function() {
        return {
            onValueChanged: function() {},
            initialValue: '',
            label: '',
            placeholder: '',
            editable: true,
            className: "mx_EditableText",
            placeholderClassName: "mx_EditableText_placeholder",
            blurToSubmit: false,
        };
    },

    getInitialState: function() {
        return {
            phase: this.Phases.Display,
        };
    },

    componentWillReceiveProps: function(nextProps) {
        if (nextProps.initialValue !== this.props.initialValue) {
            this.value = nextProps.initialValue;
            if (this.refs.editable_div) {
                this.showPlaceholder(!this.value);
            }
        }
    },

    componentWillMount: function() {
        // we track value as an JS object field rather than in React state
        // as React doesn't play nice with contentEditable.
        this.value = '';
        this.placeholder = false;
    },

    componentDidMount: function() {
        this.value = this.props.initialValue;
        if (this.refs.editable_div) {
            this.showPlaceholder(!this.value);
        }
    },

    showPlaceholder: function(show) {
        if (show) {
            this.refs.editable_div.textContent = this.props.placeholder;
            this.refs.editable_div.setAttribute("class", this.props.className + " " + this.props.placeholderClassName);
            this.placeholder = true;
            this.value = '';
        } else {
            this.refs.editable_div.textContent = this.value;
            this.refs.editable_div.setAttribute("class", this.props.className);
            this.placeholder = false;
        }
    },

    getValue: function() {
        return this.value;
    },

    setValue: function(value) {
        this.value = value;
        this.showPlaceholder(!this.value);
    },

    edit: function() {
        this.setState({
            phase: this.Phases.Edit,
        });
    },

    cancelEdit: function() {
        this.setState({
            phase: this.Phases.Display,
        });
        this.value = this.props.initialValue;
        this.showPlaceholder(!this.value);
        this.onValueChanged(false);
        this.refs.editable_div.blur();
    },

    onValueChanged: function(shouldSubmit) {
        this.props.onValueChanged(this.value, shouldSubmit);
    },

    onKeyDown: function(ev) {
        // console.log("keyDown: textContent=" + ev.target.textContent + ", value=" + this.value + ", placeholder=" + this.placeholder);

        if (this.placeholder) {
            this.showPlaceholder(false);
        }

        if (ev.key === "Enter") {
            ev.stopPropagation();
            ev.preventDefault();
        }

        // console.log("keyDown: textContent=" + ev.target.textContent + ", value=" + this.value + ", placeholder=" + this.placeholder);
    },

    onKeyUp: function(ev) {
        // console.log("keyUp: textContent=" + ev.target.textContent + ", value=" + this.value + ", placeholder=" + this.placeholder);

        if (!ev.target.textContent) {
            this.showPlaceholder(true);
        } else if (!this.placeholder) {
            this.value = ev.target.textContent;
        }

        if (ev.key === "Enter") {
            this.onFinish(ev);
        } else if (ev.key === "Escape") {
            this.cancelEdit();
        }

        // console.log("keyUp: textContent=" + ev.target.textContent + ", value=" + this.value + ", placeholder=" + this.placeholder);
    },

    onClickDiv: function(ev) {
        if (!this.props.editable) return;

        this.setState({
            phase: this.Phases.Edit,
        });
    },

    onFocus: function(ev) {
        //ev.target.setSelectionRange(0, ev.target.textContent.length);

        const node = ev.target.childNodes[0];
        if (node) {
            const range = document.createRange();
            range.setStart(node, 0);
            range.setEnd(node, node.length);

            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
    },

    onFinish: function(ev, shouldSubmit) {
        const self = this;
        const submit = (ev.key === "Enter") || shouldSubmit;
        this.setState({
            phase: this.Phases.Display,
        }, () => {
            if (this.value !== this.props.initialValue) {
                self.onValueChanged(submit);
            }
        });
    },

    onBlur: function(ev) {
        const sel = window.getSelection();
        sel.removeAllRanges();

        if (this.props.blurToCancel) {
            this.cancelEdit();
        } else {
            this.onFinish(ev, this.props.blurToSubmit);
        }

        this.showPlaceholder(!this.value);
    },

    render: function() {
        const {className, editable, initialValue, label, labelClassName} = this.props;
        let editableEl;

        if (!editable || (this.state.phase === this.Phases.Display && (label || labelClassName) && !this.value)) {
            // show the label
            editableEl = <div className={className + " " + labelClassName} onClick={this.onClickDiv}>
                { label || initialValue }
            </div>;
        } else {
            // show the content editable div, but manually manage its contents as react and contentEditable don't play nice together
            editableEl = <div ref="editable_div"
                              contentEditable={true}
                              className={className}
                              onKeyDown={this.onKeyDown}
                              onKeyUp={this.onKeyUp}
                              onFocus={this.onFocus}
                              onBlur={this.onBlur} />;
        }

        return editableEl;
    },
});
