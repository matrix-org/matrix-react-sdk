import React from 'react';
import { _t } from '../languageHandler';
import AutocompleteProvider from './AutocompleteProvider';
import MatrixClientPeg from '../MatrixClientPeg';
import Fuse from 'fuse.js';
import {PillCompletion} from './Components';
import {getDisplayAliasForRoom} from '../Rooms';
import sdk from '../index';

const ROOM_REGEX = /(?=#)(\S*)/g;

let instance = null;

export default class RoomProvider extends AutocompleteProvider {
    constructor() {
        super(ROOM_REGEX, {
            keys: ['displayName', 'userId'],
        });
        this.fuse = new Fuse([], {
           keys: ['name', 'roomId', 'aliases'],
        });
    }

    async getCompletions(query: string, selection: {start: number, end: number}, force = false) {
        const RoomAvatar = sdk.getComponent('views.avatars.RoomAvatar');

        let client = MatrixClientPeg.get();
        let completions = [];
        const {command, range} = this.getCurrentCommand(query, selection, force);
        if (command) {
            // the only reason we need to do this is because Fuse only matches on properties
            this.fuse.set(client.getRooms().filter(room => !!room).map(room => {
                return {
                    room: room,
                    name: room.name,
                    aliases: room.getAliases(),
                };
            }));
            completions = this.fuse.search(command[0]).map(room => {
                let displayAlias = getDisplayAliasForRoom(room.room) || room.roomId;
                return {
                    completion: displayAlias,
                    component: (
                        <PillCompletion initialComponent={<RoomAvatar width={24} height={24} room={room.room} />} title={room.name} description={displayAlias} />
                    ),
                    range,
                };
            }).filter(completion => !!completion.completion && completion.completion.length > 0).slice(0, 4);
        }
        return completions;
    }

    getName() {
        return '💬 ' + _t('Rooms');
    }

    static getInstance() {
        if (instance == null) {
            instance = new RoomProvider();
        }

        return instance;
    }

    renderCompletions(completions: [React.Component]): ?React.Component {
        return <div className="mx_Autocomplete_Completion_container_pill">
            {completions}
        </div>;
    }

    shouldForceComplete(): boolean {
        return true;
    }
}
