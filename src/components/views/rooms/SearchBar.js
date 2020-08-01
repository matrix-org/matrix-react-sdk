/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2020 The Matrix.org Foundation C.I.C.

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
import AccessibleButton from "../elements/AccessibleButton";
import EditorModel from '../../../editor/model';
import {PartCreator} from '../../../editor/parts';
import BasicMessageComposer from "./BasicMessageComposer";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import classNames from "classnames";
import {Key} from "../../../Keyboard";
import DesktopBuildsNotice, {WarningKind} from "../elements/DesktopBuildsNotice";

export default class SearchBar extends React.Component {
    static contextType = MatrixClientContext;

    constructor(props, context) {
        super(props, context);

        const partCreator = new PartCreator(this.props.room, this.context);
        const parts = [];
        this.model = new EditorModel(parts, partCreator);
        this.state = {
            roomIds: [],
            rooms: [],
        };
    }

    onChange = () => {
        const roomIdMap = {};
        const roomIds = [];
        const rooms = [];
        for (let i = 0; i < this.model._parts.length; i++) {
            if (typeof this.model._parts[i].room !== 'undefined') {
                roomIdMap[this.model._parts[i].room.roomId] = true;
            }
        }
        for (const roomId in roomIdMap) {
            roomIds.push(roomId);
            rooms.push(this.context.getRoom(roomId));
        }
        this.setState({roomIds, rooms});
    }

    onSearchKeydown = (e) => {
        switch (e.key) {
            case Key.ENTER:
                this.onSearch();
                e.preventDefault();
                break;
            case Key.ESCAPE:
                this.props.onCancelClick();
                break;
        }
    };

    onSearch = () => {
            const searchTerm = [];
            const senderIdMap = {};
            for (let i = 0; i < this.model._parts.length; i++) {
                if (typeof this.model._parts[i].member !== 'undefined') {
                    senderIdMap[this.model._parts[i].resourceId] = true;
                    continue;
                }
                if (typeof this.model._parts[i].room !== 'undefined') {
                    continue;
                }
                const text = this.model._parts[i]._text.trim();
                if (text !== '') {
                    searchTerm.push(text);
                }
            }
            this.props.onSearch(searchTerm.join(' '), this.state.roomIds, Object.keys(senderIdMap));
    };

    render() {
        const searchButtonClasses = classNames("mx_SearchBar_searchButton", {
            mx_SearchBar_searching: this.props.searchInProgress,
        });

        return (
            <>
                <div className="mx_SearchBar">
                    <div className="mx_SearchBar_input mx_textinput" onKeyDown={this.onSearchKeydown}>
                        <BasicMessageComposer model={this.model} rooms={this.state.rooms} onChange={this.onChange} />
                        <AccessibleButton className={ searchButtonClasses } onClick={this.onSearch} />
                    </div>
                    <AccessibleButton className="mx_SearchBar_cancel" onClick={this.props.onCancelClick} />
                </div>
                <DesktopBuildsNotice isRoomEncrypted={this.props.isRoomEncrypted} kind={WarningKind.Search} />
            </>
        );
    }
}
