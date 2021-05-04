/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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

import React, {useContext, useMemo, useState} from "react";
import classNames from "classnames";
import {Room} from "matrix-js-sdk/src/models/room";
import {MatrixClient} from "matrix-js-sdk/src/client";

import {_t} from '../../../languageHandler';
import {IDialogProps} from "./IDialogProps";
import BaseDialog from "./BaseDialog";
import Dropdown from "../elements/Dropdown";
import SearchBox from "../../structures/SearchBox";
import SpaceStore from "../../../stores/SpaceStore";
import RoomAvatar from "../avatars/RoomAvatar";
import {getDisplayAliasForRoom} from "../../../Rooms";
import AccessibleButton from "../elements/AccessibleButton";
import AutoHideScrollbar from "../../structures/AutoHideScrollbar";
import {allSettled} from "../../../utils/promise";
import DMRoomMap from "../../../utils/DMRoomMap";
import {calculateRoomVia} from "../../../utils/permalinks/Permalinks";
import StyledCheckbox from "../elements/StyledCheckbox";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import {sortRooms} from "../../../stores/room-list/algorithms/tag-sorting/RecentAlgorithm";

interface IProps extends IDialogProps {
    matrixClient: MatrixClient;
    space: Room;
    onCreateRoomClick(cli: MatrixClient, space: Room): void;
}

const Entry = ({ room, checked, onChange }) => {
    return <label className="mx_AddExistingToSpace_entry">
        <RoomAvatar room={room} height={32} width={32} />
        <span className="mx_AddExistingToSpace_entry_name">{ room.name }</span>
        <StyledCheckbox onChange={(e) => onChange(e.target.checked)} checked={checked} />
    </label>;
};

interface IAddExistingToSpaceProps {
    space: Room;
    selected: Set<Room>;
    onChange(checked: boolean, room: Room): void;
}

export const AddExistingToSpace: React.FC<IAddExistingToSpaceProps> = ({ space, selected, onChange }) => {
    const cli = useContext(MatrixClientContext);
    const visibleRooms = useMemo(() => sortRooms(cli.getVisibleRooms()), [cli]);

    const [query, setQuery] = useState("");
    const lcQuery = query.toLowerCase();

    const existingSubspaces = SpaceStore.instance.getChildSpaces(space.roomId);
    const existingSubspacesSet = new Set(existingSubspaces);
    const existingRoomsSet = new Set(SpaceStore.instance.getChildRooms(space.roomId));

    const joinRule = space.getJoinRule();
    const [spaces, rooms, dms] = visibleRooms.reduce((arr, room) => {
        if (room.getMyMembership() !== "join") return arr;
        if (!room.name.toLowerCase().includes(lcQuery)) return arr;

        if (room.isSpaceRoom()) {
            if (room !== space && !existingSubspacesSet.has(room)) {
                arr[0].push(room);
            }
        } else if (!existingRoomsSet.has(room)) {
            if (!DMRoomMap.shared().getUserIdForRoomId(room.roomId)) {
                arr[1].push(room);
            } else if (joinRule !== "public") {
                // Only show DMs for non-public spaces as they make very little sense in spaces other than "Just Me" ones.
                arr[2].push(room);
            }
        }
        return arr;
    }, [[], [], []]);

    return <div className="mx_AddExistingToSpace">
        <SearchBox
            className="mx_textinput_icon mx_textinput_search"
            placeholder={ _t("Filter your rooms and spaces") }
            onSearch={setQuery}
            autoComplete={true}
            autoFocus={true}
        />
        <AutoHideScrollbar className="mx_AddExistingToSpace_content" id="mx_AddExistingToSpace">
            { rooms.length > 0 ? (
                <div className="mx_AddExistingToSpace_section">
                    <h3>{ _t("Rooms") }</h3>
                    { rooms.map(room => {
                        return <Entry
                            key={room.roomId}
                            room={room}
                            checked={selected.has(room)}
                            onChange={(checked) => {
                                onChange(checked, room);
                            }}
                        />;
                    }) }
                </div>
            ) : undefined }

            { spaces.length > 0 ? (
                <div className="mx_AddExistingToSpace_section mx_AddExistingToSpace_section_spaces">
                    <h3>{ _t("Spaces") }</h3>
                    { spaces.map(space => {
                        return <Entry
                            key={space.roomId}
                            room={space}
                            checked={selected.has(space)}
                            onChange={(checked) => {
                                onChange(checked, space);
                            }}
                        />;
                    }) }
                </div>
            ) : null }

            { dms.length > 0 ? (
                <div className="mx_AddExistingToSpace_section">
                    <h3>{ _t("Direct Messages") }</h3>
                    { dms.map(room => {
                        return <Entry
                            key={room.roomId}
                            room={room}
                            checked={selected.has(room)}
                            onChange={(checked) => {
                                onChange(checked, room);
                            }}
                        />;
                    }) }
                </div>
            ) : null }

            { spaces.length + rooms.length + dms.length < 1 ? <span className="mx_AddExistingToSpace_noResults">
                { _t("No results") }
            </span> : undefined }
        </AutoHideScrollbar>
    </div>;
};

const AddExistingToSpaceDialog: React.FC<IProps> = ({ matrixClient: cli, space, onCreateRoomClick, onFinished }) => {
    const [selectedSpace, setSelectedSpace] = useState(space);
    const existingSubspaces = SpaceStore.instance.getChildSpaces(space.roomId);
    const [selectedToAdd, setSelectedToAdd] = useState(new Set<Room>());

    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    let spaceOptionSection;
    if (existingSubspaces.length > 0) {
        const options = [space, ...existingSubspaces].map((space) => {
            const classes = classNames("mx_AddExistingToSpaceDialog_dropdownOption", {
                mx_AddExistingToSpaceDialog_dropdownOptionActive: space === selectedSpace,
            });
            return <div key={space.roomId} className={classes}>
                <RoomAvatar room={space} width={24} height={24} />
                { space.name || getDisplayAliasForRoom(space) || space.roomId }
            </div>;
        });

        spaceOptionSection = (
            <Dropdown
                id="mx_SpaceSelectDropdown"
                onOptionChange={(key: string) => {
                    setSelectedSpace(existingSubspaces.find(space => space.roomId === key) || space);
                }}
                value={selectedSpace.roomId}
                label={_t("Space selection")}
            >
                { options }
            </Dropdown>
        );
    } else {
        spaceOptionSection = <div className="mx_AddExistingToSpaceDialog_onlySpace">
            { space.name || getDisplayAliasForRoom(space) || space.roomId }
        </div>;
    }

    const title = <React.Fragment>
        <RoomAvatar room={selectedSpace} height={40} width={40} />
        <div>
            <h1>{ _t("Add existing rooms") }</h1>
            { spaceOptionSection }
        </div>
    </React.Fragment>;

    return <BaseDialog
        title={title}
        className="mx_AddExistingToSpaceDialog"
        contentId="mx_AddExistingToSpace"
        onFinished={onFinished}
        fixedWidth={false}
    >
        { error && <div className="mx_AddExistingToSpaceDialog_errorText">{ error }</div> }

        <MatrixClientContext.Provider value={cli}>
            <AddExistingToSpace
                space={space}
                selected={selectedToAdd}
                onChange={(checked, room) => {
                    if (checked) {
                        selectedToAdd.add(room);
                    } else {
                        selectedToAdd.delete(room);
                    }
                    setSelectedToAdd(new Set(selectedToAdd));
                }}
            />
        </MatrixClientContext.Provider>

        <div className="mx_AddExistingToSpaceDialog_footer">
            <span>
                <div>{ _t("Don't want to add an existing room?") }</div>
                <AccessibleButton onClick={() => onCreateRoomClick(cli, space)} kind="link">
                    { _t("Create a new room") }
                </AccessibleButton>
            </span>

            <AccessibleButton
                kind="primary"
                disabled={busy || selectedToAdd.size < 1}
                onClick={async () => {
                    // TODO rate limiting
                    setBusy(true);
                    try {
                        await allSettled(Array.from(selectedToAdd).map((room) =>
                            SpaceStore.instance.addRoomToSpace(space, room.roomId, calculateRoomVia(room))));
                        onFinished(true);
                    } catch (e) {
                        console.error("Failed to add rooms to space", e);
                        setError(_t("Failed to add rooms to space"));
                    }
                    setBusy(false);
                }}
            >
                { busy ? _t("Adding...") : _t("Add") }
            </AccessibleButton>
        </div>
    </BaseDialog>;
};

export default AddExistingToSpaceDialog;

