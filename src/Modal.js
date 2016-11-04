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

var React = require('react');
var ReactDOM = require('react-dom');

module.exports = {
    DialogContainerId: "mx_Dialog_Container",
    _modals: [],

    getOrCreateContainer: function() {
        var container = document.getElementById(this.DialogContainerId);

        if (!container) {
            container = document.createElement("div");
            container.id = this.DialogContainerId;
            document.body.appendChild(container);
        }

        return container;
    },

    createDialog: function (Element, props, className) {
        var self = this;

        var modal = {};

        // never call this from onFinished() otherwise it will loop
        //
        // nb explicit function() rather than arrow function, to get `arguments`
        var closeDialog = function() {
            if (props && props.onFinished) props.onFinished.apply(null, arguments);
            var i = self._modals.indexOf(modal);
            if (i >= 0) {
                self._modals.splice(i, 1);
            }
            self._reRender();
        };

        // FIXME: If a dialog uses getDefaultProps it clobbers the onFinished
        // property set here so you can't close the dialog from a button click!
        modal.elem = <Element {...props} onFinished={closeDialog}/>;
        modal.onFinished = props ? props.onFinished : null;
        modal.className = className;

        this._modals.unshift(modal);

        this._reRender();
        return {close: closeDialog};
    },

    _closeAll: function() {
        for (let i = 0; i < this._modals.length; i++) {
            const m = this._modals[i];
            if (m.onFinished) {
                m.onFinished(false);
            }
        }
        this._modals = [];
        this._reRender();
    },

    _reRender: function() {
        if (this._modals.length == 0) {
            ReactDOM.unmountComponentAtNode(this.getOrCreateContainer());
            return;
        }

        var modal = this._modals[0];
        var dialog = (
            <div className={"mx_Dialog_wrapper " + modal.className}>
                <div className="mx_Dialog">
                    {modal.elem}
                </div>
                <div className="mx_Dialog_background" onClick={ this._closeAll.bind(this) }></div>
            </div>
        );

        ReactDOM.render(dialog, this.getOrCreateContainer());
    },
};
