/*
Copyright 2017-2021 The Matrix.org Foundation C.I.C.

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

import { _t } from '../../../languageHandler';
import Field from "./Field";
import AccessibleButton from "./AccessibleButton";
import { replaceableComponent } from "../../../utils/replaceableComponent";

interface IItemProps {
    index?: number;
    value?: string;
    onRemove?(index: number): void;
}

interface IItemState {
    verifyRemove: boolean;
}

export class EditableItem extends React.Component<IItemProps, IItemState> {
    public state = {
        verifyRemove: false,
    };

    private onRemove = (e) => {
        e.stopPropagation();
        e.preventDefault();

        this.setState({ verifyRemove: true });
    };

    private onDontRemove = (e) => {
        e.stopPropagation();
        e.preventDefault();

        this.setState({ verifyRemove: false });
    };

    private onActuallyRemove = (e) => {
        e.stopPropagation();
        e.preventDefault();

        if (this.props.onRemove) this.props.onRemove(this.props.index);
        this.setState({ verifyRemove: false });
    };

    render() {
        if (this.state.verifyRemove) {
            return (
                <div className="mx_EditableItem">
                    <span className="mx_EditableItem_promptText">
                        {_t("Are you sure?")}
                    </span>
                    <AccessibleButton
                        onClick={this.onActuallyRemove}
                        kind="primary_sm"
                        className="mx_EditableItem_confirmBtn"
                    >
                        {_t("Yes")}
                    </AccessibleButton>
                    <AccessibleButton
                        onClick={this.onDontRemove}
                        kind="danger_sm"
                        className="mx_EditableItem_confirmBtn"
                    >
                        {_t("No")}
                    </AccessibleButton>
                </div>
            );
        }

        return (
            <div className="mx_EditableItem">
                <div onClick={this.onRemove} className="mx_EditableItem_delete" title={_t("Remove")} role="button" />
                <span className="mx_EditableItem_item">{this.props.value}</span>
            </div>
        );
    }
}

interface IProps {
    id: string;
    items: string[];
    itemsLabel?: string;
    noItemsLabel?: string;
    placeholder?: string;
    newItem?: string;
    canEdit?: boolean;
    canRemove?: boolean;
    suggestionsListId?: string;
    onItemAdded?(item: string): void;
    onItemRemoved?(index: number): void;
    onNewItemChanged?(item: string): void;
}

@replaceableComponent("views.elements.EditableItemList")
export default class EditableItemList<P = {}> extends React.PureComponent<IProps & P> {
    protected onItemAdded = (e) => {
        e.stopPropagation();
        e.preventDefault();

        if (this.props.onItemAdded) this.props.onItemAdded(this.props.newItem);
    };

    protected onItemRemoved = (index) => {
        if (this.props.onItemRemoved) this.props.onItemRemoved(index);
    };

    protected onNewItemChanged = (e) => {
        if (this.props.onNewItemChanged) this.props.onNewItemChanged(e.target.value);
    };

    protected renderNewItemField() {
        return (
            <form
                onSubmit={this.onItemAdded}
                autoComplete="off"
                noValidate={true}
                className="mx_EditableItemList_newItem"
            >
                <Field
                    label={this.props.placeholder}
                    type="text"
                    autoComplete="off"
                    value={this.props.newItem || ""}
                    onChange={this.onNewItemChanged}
                    list={this.props.suggestionsListId}
                />
                <AccessibleButton
                    onClick={this.onItemAdded}
                    kind="primary"
                    type="submit"
                    disabled={!this.props.newItem}
                >
                    { _t("Add") }
                </AccessibleButton>
            </form>
        );
    }

    render() {
        const editableItems = this.props.items.map((item, index) => {
            if (!this.props.canRemove) {
                return <li key={item}>{item}</li>;
            }

            return <EditableItem
                key={item}
                index={index}
                value={item}
                onRemove={this.onItemRemoved}
            />;
        });

        const editableItemsSection = this.props.canRemove ? editableItems : <ul>{editableItems}</ul>;
        const label = this.props.items.length > 0 ? this.props.itemsLabel : this.props.noItemsLabel;

        return (
            <div className="mx_EditableItemList">
                <div className="mx_EditableItemList_label">
                    { label }
                </div>
                { editableItemsSection }
                { this.props.canEdit ? this.renderNewItemField() : <div /> }
            </div>
        );
    }
}
