/*
Copyright 2017 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2018 - 2021 The Matrix.org Foundation C.I.C.

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

import React, { ChangeEvent, ReactElement } from "react";
import { _t } from "../../../../languageHandler";
import Field from "../../elements/Field";
import TruncatedList from "../../elements/TruncatedList";

const INITIAL_LOAD_TILES = 20;
const LOAD_TILES_STEP_SIZE = 50;

interface IProps {
    children: ReactElement[];
    query: string;
    noTruncate?: boolean;
    onChange(value: string): void;
    wrapperElement?(child: JSX.Element): JSX.Element;
}

interface IState {
    filteredChildren: React.ReactElement[];
    truncateAt: number;
}

export default class FilteredList extends React.PureComponent<IProps, IState> {
    static filterChildren(children: React.ReactElement[], query: string): React.ReactElement[] {
        if (!query) return children;
        const lcQuery = query.trim().toLowerCase();
        return children.filter((child) => child.key.toString().toLowerCase().includes(lcQuery));
    }

    constructor(props) {
        super(props);

        this.state = {
            filteredChildren: FilteredList.filterChildren(this.props.children, this.props.query),
            truncateAt: INITIAL_LOAD_TILES,
        };
    }

    // TODO: [REACT-WARNING] Replace with appropriate lifecycle event
    UNSAFE_componentWillReceiveProps(nextProps) { // eslint-disable-line camelcase
        if (this.props.children === nextProps.children && this.props.query === nextProps.query) return;
        this.setState({
            filteredChildren: FilteredList.filterChildren(nextProps.children, nextProps.query),
            truncateAt: INITIAL_LOAD_TILES,
        });
    }

    private showAll = () => {
        this.setState({
            truncateAt: this.state.truncateAt + LOAD_TILES_STEP_SIZE,
        });
    };

    private createOverflowElement = (overflowCount: number, totalCount: number) => {
        return <button className="mx_Devtools_RoomStateExplorer_button" onClick={this.showAll}>
            { _t("and %(count)s others...", { count: overflowCount }) }
        </button>;
    };

    private onQuery = (ev: ChangeEvent<HTMLInputElement>) => {
        if (this.props.onChange) this.props.onChange(ev.target.value);
    };

    private getChildren = (start: number, end: number): React.ReactElement[] => {
        return this.state.filteredChildren.slice(start, end);
    };

    private getChildCount = (): number => {
        return this.state.filteredChildren.length;
    };

    render() {
        let body: JSX.Element;
        if (this.props.noTruncate) {
            body = <>{ this.state.filteredChildren }</>;
        } else {
            body = <TruncatedList
                getChildren={this.getChildren}
                getChildCount={this.getChildCount}
                truncateAt={this.state.truncateAt}
                createOverflowElement={this.createOverflowElement}
                className="mx_Devtools_buttonGrid"
            />;
        }

        if (this.props.wrapperElement) {
            body = this.props.wrapperElement(body);
        }

        return <div>
            <Field
                label={_t('Filter results')}
                autoFocus={true}
                size={64}
                type="text"
                autoComplete="off"
                value={this.props.query}
                onChange={this.onQuery}
                // force re-render so that autoFocus is applied when this component is re-used
                key={this.props.children[0] ? this.props.children[0].key : ''}
            />

            { body }
        </div>;
    }
}
