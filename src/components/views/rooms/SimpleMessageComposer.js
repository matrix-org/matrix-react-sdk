/*
Copyright 2019 New Vector Ltd

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

import React from "react";
import PropTypes from 'prop-types';
import getCaretCoordinates from "textarea-caret";
import * as ContextualMenu from '../../structures/ContextualMenu';

function firstDiff(a, b) {
    const compareLen = Math.min(a.length, b.length);
    for (let i = 0; i < compareLen; ++i) {
        if (a[i] !== b[i]) {
            return i;
        }
    }
    return compareLen;
}

function diffStringsAtEnd(oldStr, newStr) {
    const len = Math.min(oldStr.length, newStr.length);
    const startInCommon = oldStr.substr(0, len) === newStr.substr(0, len);
    if (startInCommon && oldStr.length > newStr.length) {
        return {removed: oldStr.substr(len), at: len};
    } else if (startInCommon && oldStr.length < newStr.length) {
        return {added: newStr.substr(len), at: len};
    } else {
        const commonStartLen = firstDiff(oldStr, newStr);
        return {
            replaced: [
                oldStr.substr(commonStartLen),
                newStr.substr(commonStartLen),
            ],
            at: commonStartLen,
        };
    }
}

function diffAtCaret(oldValue, newValue, caretPosition) {
    const diffLen = newValue.length - oldValue.length;
    const caretPositionBeforeInput = caretPosition - diffLen;
    const oldValueBeforeCaret = oldValue.substr(0, caretPositionBeforeInput);
    const newValueBeforeCaret = newValue.substr(0, caretPosition);
    return diffStringsAtEnd(oldValueBeforeCaret, newValueBeforeCaret);
}


class PeoplePopup extends React.Component {
    render() {
        const style = {
            backgroundColor: "red",
            height: "200px",
            width: "100px",
        };
        return <div style={style}>{this.props.msg}</div>;
    }
}

export default class SimpleMessageComposer extends React.Component {

    static propTypes = {
        room: PropTypes.object.isRequired,
    };

    render() {
        return <textarea onInput={this._onInput} className="mx_SimpleMessageComposer" />;
    }

    _onInput = (evt) => {
        if (this._popupHandle) {
            this._popupHandle.close();
        }
        const target = evt.target;
        // need to diff input values because InputEvent.data is not supported on FF
        // also, need to find out about deletions, and pasting, ...
        // also, we probably need the position to update our model
        const newValue = target.value;
        const diff = diffAtCaret(this.oldValue || "", newValue, target.selectionEnd);
        this.oldValue = newValue;
        console.log(diff);
        if (diff.added || diff.replaced) {
            const added = diff.added || diff.replaced[1];
            if (added.indexOf("@") !== -1) {
                const pxPos = getCaretCoordinates(target, target.selectionEnd);
                const bounds = target.getBoundingClientRect();
                const left = bounds.left + pxPos.left;
                const top = bounds.top + pxPos.top - 200;
                this._popupHandle = ContextualMenu.createMenu(PeoplePopup, {
                    onFinished: () => this._popupHandle = null,
                    chevronFace: "none",
                    left,
                    top,
                    msg: `${left} = ${bounds.left} + ${pxPos.left}`,
                });
            }
        }
    }
}
