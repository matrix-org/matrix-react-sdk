/*
Copyright 2016 Aviral Dasgupta
Copyright 2017 New Vector Ltd

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
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import flatMap from 'lodash/flatMap';
import isEqual from 'lodash/isEqual';
import sdk from '../../../index';
import type {Completion} from '../../../autocomplete/Autocompleter';
import Promise from 'bluebird';
import { Room } from 'matrix-js-sdk';

import {getCompletions} from '../../../autocomplete/Autocompleter';
import SettingsStore from "../../../settings/SettingsStore";
import Autocompleter from '../../../autocomplete/Autocompleter';

const COMPOSER_SELECTED = 0;

export default class Autocomplete extends React.Component {

    constructor(props) {
        super(props);

        this.autocompleter = new Autocompleter(props.room);
        this.completionPromise = null;
        this.hide = this.hide.bind(this);
        this.onCompletionClicked = this.onCompletionClicked.bind(this);

        this.state = {
            // list of completionResults, each containing completions
            completions: [],

            // array of completions, so we can look up current selection by offset quickly
            completionList: [],

            // how far down the completion list we are (THIS IS 1-INDEXED!)
            selectionOffset: COMPOSER_SELECTED,

            // whether we should show completions if they're available
            shouldShowCompletions: true,

            hide: false,

            forceComplete: false,
        };
    }

    componentWillReceiveProps(newProps, state) {
        if (this.props.room.roomId !== newProps.room.roomId) {
            this.autocompleter.destroy();
            this.autocompleter = new Autocompleter(newProps.room);
        }

        // Query hasn't changed so don't try to complete it
        if (newProps.query === this.props.query) {
            return;
        }

        this.complete(newProps.query, newProps.selection);
    }

    componentWillUnmount() {
        this.autocompleter.destroy();
    }

    complete(query, selection) {
        this.queryRequested = query;
        if (this.debounceCompletionsRequest) {
            clearTimeout(this.debounceCompletionsRequest);
        }
        if (query === "") {
            this.setState({
                // Clear displayed completions
                completions: [],
                completionList: [],
                // Reset selected completion
                selectionOffset: COMPOSER_SELECTED,
                // Hide the autocomplete box
                hide: true,
            });
            return Promise.resolve(null);
        }
        let autocompleteDelay = SettingsStore.getValue("autocompleteDelay");

        // Don't debounce if we are already showing completions
        if (this.state.completions.length > 0 || this.state.forceComplete) {
            autocompleteDelay = 0;
        }

        const deferred = Promise.defer();
        this.debounceCompletionsRequest = setTimeout(() => {
            this.processQuery(query, selection).then(() => {
                deferred.resolve();
            });
        }, autocompleteDelay);
        return deferred.promise;
    }

    processQuery(query, selection) {
        return this.autocompleter.getCompletions(
            query, selection, this.state.forceComplete
        ).then((completions) => {
            // Only ever process the completions for the most recent query being processed
            if (query !== this.queryRequested) {
                return;
            }
            this.processCompletions(completions);
        });
    }

    processCompletions(completions) {
        const completionList = flatMap(completions, (provider) => provider.completions);

        // Reset selection when completion list becomes empty.
        let selectionOffset = COMPOSER_SELECTED;
        if (completionList.length > 0) {
            /* If the currently selected completion is still in the completion list,
             try to find it and jump to it. If not, select composer.
             */
            const currentSelection = this.state.selectionOffset === 0 ? null :
                this.state.completionList[this.state.selectionOffset - 1].completion;
            selectionOffset = completionList.findIndex(
                (completion) => completion.completion === currentSelection);
            if (selectionOffset === -1) {
                selectionOffset = COMPOSER_SELECTED;
            } else {
                selectionOffset++; // selectionOffset is 1-indexed!
            }
        }

        let hide = this.state.hide;
        // If `completion.command.command` is truthy, then a provider has matched with the query
        const anyMatches = completions.some((completion) => !!completion.command.command);
        hide = !anyMatches;

        this.setState({
            completions,
            completionList,
            selectionOffset,
            hide,
            // Force complete is turned off each time since we can't edit the query in that case
            forceComplete: false,
        });
    }

    countCompletions(): number {
        return this.state.completionList.length;
    }

    // called from MessageComposerInput
    onUpArrow(): ?Completion {
        const completionCount = this.countCompletions();
        // completionCount + 1, since 0 means composer is selected
        const selectionOffset = (completionCount + 1 + this.state.selectionOffset - 1)
            % (completionCount + 1);
        if (!completionCount) {
            return null;
        }
        this.setSelection(selectionOffset);
    }

    // called from MessageComposerInput
    onDownArrow(): ?Completion {
        const completionCount = this.countCompletions();
        // completionCount + 1, since 0 means composer is selected
        const selectionOffset = (this.state.selectionOffset + 1) % (completionCount + 1);
        if (!completionCount) {
            return null;
        }
        this.setSelection(selectionOffset);
    }

    onEscape(e): boolean {
        const completionCount = this.countCompletions();
        if (completionCount === 0) {
            // autocomplete is already empty, so don't preventDefault
            return;
        }

        e.preventDefault();

        // selectionOffset = 0, so we don't end up completing when autocomplete is hidden
        this.hide();
    }

    hide() {
        this.setState({hide: true, selectionOffset: 0, completions: [], completionList: []});
    }

    forceComplete() {
        const done = Promise.defer();
        this.setState({
            forceComplete: true,
            hide: false,
        }, () => {
            this.complete(this.props.query, this.props.selection).then(() => {
                done.resolve(this.countCompletions());
            });
        });
        return done.promise;
    }

    onCompletionClicked(selectionOffset: number): boolean {
        if (this.countCompletions() === 0 || selectionOffset === COMPOSER_SELECTED) {
            return false;
        }

        this.props.onConfirm(this.state.completionList[selectionOffset - 1]);
        this.hide();

        return true;
    }

    setSelection(selectionOffset: number) {
        this.setState({selectionOffset, hide: false});
        if (this.props.onSelectionChange) {
            this.props.onSelectionChange(this.state.completionList[selectionOffset - 1]);
        }
    }

    componentDidUpdate() {
        // this is the selected completion, so scroll it into view if needed
        const selectedCompletion = this.refs[`completion${this.state.selectionOffset}`];
        if (selectedCompletion && this.container) {
            const domNode = ReactDOM.findDOMNode(selectedCompletion);
            const offsetTop = domNode && domNode.offsetTop;
            if (offsetTop > this.container.scrollTop + this.container.offsetHeight ||
                offsetTop < this.container.scrollTop) {
                this.container.scrollTop = offsetTop - this.container.offsetTop;
            }
        }
    }

    setState(state, func) {
        super.setState(state, func);
    }

    render() {
        const EmojiText = sdk.getComponent('views.elements.EmojiText');

        let position = 1;
        const renderedCompletions = this.state.completions.map((completionResult, i) => {
            const completions = completionResult.completions.map((completion, i) => {
                const className = classNames('mx_Autocomplete_Completion', {
                    'selected': position === this.state.selectionOffset,
                });
                const componentPosition = position;
                position++;

                const onClick = () => {
                    this.onCompletionClicked(componentPosition);
                };

                return React.cloneElement(completion.component, {
                    key: i,
                    ref: `completion${position - 1}`,
                    className,
                    onClick,
                });
            });


            return completions.length > 0 ? (
                <div key={i} className="mx_Autocomplete_ProviderSection">
                    <EmojiText element="div" className="mx_Autocomplete_provider_name">{ completionResult.provider.getName() }</EmojiText>
                    { completionResult.provider.renderCompletions(completions) }
                </div>
            ) : null;
        }).filter((completion) => !!completion);

        return !this.state.hide && renderedCompletions.length > 0 ? (
            <div className="mx_Autocomplete" ref={(e) => this.container = e}>
                { renderedCompletions }
            </div>
        ) : null;
    }
}

Autocomplete.propTypes = {
    // the query string for which to show autocomplete suggestions
    query: PropTypes.string.isRequired,

    // method invoked with range and text content when completion is confirmed
    onConfirm: PropTypes.func.isRequired,

    // The room in which we're autocompleting
    room: PropTypes.instanceOf(Room),
};
