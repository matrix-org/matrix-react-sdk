/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

import React, { useCallback, useContext, useRef, useState } from 'react';
import { Room } from 'matrix-js-sdk/src/models/room';
import { EventType } from "matrix-js-sdk/src/@types/event";

import { _t } from "../../../languageHandler";
import { ICompletion } from '../../../autocomplete/Autocompleter';
import UserProvider from "../../../autocomplete/UserProvider";
import { AutocompleteInput } from "../../structures/AutocompleteInput";
import PowerSelector from "../elements/PowerSelector";
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import AccessibleButton from "../elements/AccessibleButton";
import Modal from "../../../Modal";
import ErrorDialog from "../dialogs/ErrorDialog";

interface AddPrivilegedUsersProps {
    room: Room;
    defaultUserLevel: number;
}

export const AddPrivilegedUsers: React.FC<AddPrivilegedUsersProps> = ({ room, defaultUserLevel }) => {
    const client = useContext(MatrixClientContext);
    const userProvider = useRef(new UserProvider(room));
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [powerLevel, setPowerLevel] = useState<number>(defaultUserLevel);
    const [selectedUsers, setSelectedUsers] = useState<ICompletion[]>([]);
    const filterSuggestions = useCallback(
        (user: ICompletion) => room.getMember(user.completionId)?.powerLevel <= defaultUserLevel,
        [room, defaultUserLevel],
    );

    const onSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);

        const userIds = selectedUsers.map(selectedUser => selectedUser.completionId);
        const powerLevelEvent = room.currentState.getStateEvents(EventType.RoomPowerLevels, "");

        try {
            await client.setPowerLevel(room.roomId, userIds, powerLevel, powerLevelEvent);
            setSelectedUsers([]);
            setPowerLevel(defaultUserLevel);
        } catch (error) {
            Modal.createDialog(ErrorDialog, {
                title: _t("Error"),
                description: _t("Failed to change power level"),
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form className="mx_SettingsFieldset" onSubmit={onSubmit}>
            <fieldset style={{ width: '100%' }}>
                <legend className='mx_SettingsFieldset_legend'>{ _t('Add privileged users') }</legend>
                <div className='mx_SettingsFieldset_description'>
                    { _t('Give one or multiple users in this room more privileges') }
                </div>
                <AutocompleteInput
                    provider={userProvider.current}
                    placeholder={_t("Search users in this room …")}
                    onSelectionChange={setSelectedUsers}
                    selection={selectedUsers}
                    additionalFilter={filterSuggestions}
                />
                <PowerSelector value={powerLevel} onChange={setPowerLevel} />
                <AccessibleButton
                    type='submit'
                    kind='primary'
                    disabled={!selectedUsers.length || isLoading}
                    onClick={onSubmit}
                >
                    { _t('Apply') }
                </AccessibleButton>
            </fieldset>
        </form>
    );
};
