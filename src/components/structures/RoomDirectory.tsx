/*
Copyright 2019 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2015, 2016, 2019, 2020, 2021 The Matrix.org Foundation C.I.C.

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

import { MatrixClientPeg } from "../../MatrixClientPeg";
import dis from "../../dispatcher/dispatcher";
import Modal from "../../Modal";
import { linkifyAndSanitizeHtml } from '../../HtmlUtils';
import { _t } from '../../languageHandler';
import SdkConfig from '../../SdkConfig';
import { instanceForInstanceId, protocolNameForInstanceId } from '../../utils/DirectoryUtils';
import Analytics from '../../Analytics';
import {ALL_ROOMS, IFieldType, IInstance, IProtocol, Protocols} from "../views/directory/NetworkDropdown";
import SettingsStore from "../../settings/SettingsStore";
import GroupFilterOrderStore from "../../stores/GroupFilterOrderStore";
import GroupStore from "../../stores/GroupStore";
import FlairStore from "../../stores/FlairStore";
import CountlyAnalytics from "../../CountlyAnalytics";
import { replaceableComponent } from "../../utils/replaceableComponent";
import { mediaFromMxc } from "../../customisations/Media";
import { IDialogProps } from "../views/dialogs/IDialogProps";
import AccessibleButton, {ButtonEvent} from "../views/elements/AccessibleButton";
import BaseAvatar from "../views/avatars/BaseAvatar";
import ErrorDialog from "../views/dialogs/ErrorDialog";
import QuestionDialog from "../views/dialogs/QuestionDialog";
import BaseDialog from "../views/dialogs/BaseDialog";
import DirectorySearchBox from "../views/elements/DirectorySearchBox";
import NetworkDropdown from "../views/directory/NetworkDropdown";
import ScrollPanel from "./ScrollPanel";
import Spinner from "../views/elements/Spinner";
import { ActionPayload } from "../../dispatcher/payloads";


const MAX_NAME_LENGTH = 80;
const MAX_TOPIC_LENGTH = 800;

function track(action: string) {
    Analytics.trackEvent('RoomDirectory', action);
}

interface IProps extends IDialogProps {
    initialText?: string;
}

interface IState {
    publicRooms: IRoom[];
    loading: boolean;
    protocolsLoading: boolean;
    error?: string;
    instanceId: string | symbol;
    roomServer: string;
    filterString: string;
    selectedCommunityId?: string;
    communityName?: string;
}

/* eslint-disable camelcase */
interface IRoom {
    room_id: string;
    name?: string;
    avatar_url?: string;
    topic?: string;
    canonical_alias?: string;
    aliases?: string[];
    world_readable: boolean;
    guest_can_join: boolean;
    num_joined_members: number;
}

interface IPublicRoomsRequest {
    limit?: number;
    since?: string;
    server?: string;
    filter?: object;
    include_all_networks?: boolean;
    third_party_instance_id?: string;
}
/* eslint-enable camelcase */

@replaceableComponent("structures.RoomDirectory")
export default class RoomDirectory extends React.Component<IProps, IState> {
    private readonly startTime: number;
    private unmounted = false
    private nextBatch: string = null;
    private filterTimeout: NodeJS.Timeout;
    private protocols: Protocols;

    constructor(props) {
        super(props);

        CountlyAnalytics.instance.trackRoomDirectoryBegin();
        this.startTime = CountlyAnalytics.getTimestamp();

        const selectedCommunityId = SettingsStore.getValue("feature_communities_v2_prototypes")
            ? GroupFilterOrderStore.getSelectedTags()[0]
            : null;

        let protocolsLoading = true;
        if (!MatrixClientPeg.get()) {
            // We may not have a client yet when invoked from welcome page
            protocolsLoading = false;
        } else if (!selectedCommunityId) {
            MatrixClientPeg.get().getThirdpartyProtocols().then((response) => {
                this.protocols = response;
                this.setState({ protocolsLoading: false });
            }, (err) => {
                console.warn(`error loading third party protocols: ${err}`);
                this.setState({ protocolsLoading: false });
                if (MatrixClientPeg.get().isGuest()) {
                    // Guests currently aren't allowed to use this API, so
                    // ignore this as otherwise this error is literally the
                    // thing you see when loading the client!
                    return;
                }
                track('Failed to get protocol list from homeserver');
                const brand = SdkConfig.get().brand;
                this.setState({
                    error: _t(
                        '%(brand)s failed to get the protocol list from the homeserver. ' +
                        'The homeserver may be too old to support third party networks.',
                        { brand },
                    ),
                });
            });
        } else {
            // We don't use the protocols in the communities v2 prototype experience
            protocolsLoading = false;

            // Grab the profile info async
            FlairStore.getGroupProfileCached(MatrixClientPeg.get(), this.state.selectedCommunityId).then(profile => {
                this.setState({ communityName: profile.name });
            });
        }

        this.state = {
            publicRooms: [],
            loading: true,
            error: null,
            instanceId: undefined,
            roomServer: MatrixClientPeg.getHomeserverName(),
            filterString: this.props.initialText || "",
            selectedCommunityId,
            communityName: null,
            protocolsLoading,
        };
    }

    componentDidMount() {
        this.refreshRoomList();
    }

    componentWillUnmount() {
        if (this.filterTimeout) {
            clearTimeout(this.filterTimeout);
        }
        this.unmounted = true;
    }

    private refreshRoomList = () => {
        if (this.state.selectedCommunityId) {
            this.setState({
                publicRooms: GroupStore.getGroupRooms(this.state.selectedCommunityId).map(r => {
                    return {
                        // Translate all the group properties to the directory format
                        room_id: r.roomId,
                        name: r.name,
                        topic: r.topic,
                        canonical_alias: r.canonicalAlias,
                        num_joined_members: r.numJoinedMembers,
                        avatarUrl: r.avatarUrl,
                        world_readable: r.worldReadable,
                        guest_can_join: r.guestsCanJoin,
                    };
                }).filter(r => {
                    const filterString = this.state.filterString;
                    if (filterString) {
                        const containedIn = (s: string) => (s || "").toLowerCase().includes(filterString.toLowerCase());
                        return containedIn(r.name) || containedIn(r.topic) || containedIn(r.canonical_alias);
                    }
                    return true;
                }),
                loading: false,
            });
            return;
        }

        this.nextBatch = null;
        this.setState({
            publicRooms: [],
            loading: true,
        });
        this.getMoreRooms();
    };

    private getMoreRooms() {
        if (this.state.selectedCommunityId) return Promise.resolve(); // no more rooms
        if (!MatrixClientPeg.get()) return Promise.resolve();

        this.setState({
            loading: true,
        });

        const filterString = this.state.filterString;
        const roomServer = this.state.roomServer;
        // remember the next batch token when we sent the request
        // too. If it's changed, appending to the list will corrupt it.
        const nextBatch = this.nextBatch;
        const opts: IPublicRoomsRequest = { limit: 20 };
        if (roomServer != MatrixClientPeg.getHomeserverName()) {
            opts.server = roomServer;
        }
        if (this.state.instanceId === ALL_ROOMS) {
            opts.include_all_networks = true;
        } else if (this.state.instanceId) {
            opts.third_party_instance_id = this.state.instanceId as string;
        }
        if (this.nextBatch) opts.since = this.nextBatch;
        if (filterString) opts.filter = { generic_search_term: filterString };
        return MatrixClientPeg.get().publicRooms(opts).then((data) => {
            if (
                filterString != this.state.filterString ||
                roomServer != this.state.roomServer ||
                nextBatch != this.nextBatch) {
                // if the filter or server has changed since this request was sent,
                // throw away the result (don't even clear the busy flag
                // since we must still have a request in flight)
                return;
            }

            if (this.unmounted) {
                // if we've been unmounted, we don't care either.
                return;
            }

            if (this.state.filterString) {
                const count = data.total_room_count_estimate || data.chunk.length;
                CountlyAnalytics.instance.trackRoomDirectorySearch(count, this.state.filterString);
            }

            this.nextBatch = data.next_batch;
            this.setState((s) => ({
                ...s,
                publicRooms: [...s.publicRooms, ...(data.chunk || [])],
                loading: false,
            }));
            return Boolean(data.next_batch);
        }, (err) => {
            if (
                filterString != this.state.filterString ||
                roomServer != this.state.roomServer ||
                nextBatch != this.nextBatch) {
                // as above: we don't care about errors for old
                // requests either
                return;
            }

            if (this.unmounted) {
                // if we've been unmounted, we don't care either.
                return;
            }

            console.error("Failed to get publicRooms: %s", JSON.stringify(err));
            track('Failed to get public room list');
            const brand = SdkConfig.get().brand;
            this.setState({
                loading: false,
                error: (
                    _t('%(brand)s failed to get the public room list.', { brand }) +
                    (err && err.message) ? err.message : _t('The homeserver may be unavailable or overloaded.')
                ),
            });
        });
    }

    /**
     * A limited interface for removing rooms from the directory.
     * Will set the room to not be publicly visible and delete the
     * default alias. In the long term, it would be better to allow
     * HS admins to do this through the RoomSettings interface, but
     * this needs SPEC-417.
     */
    private removeFromDirectory(room: IRoom) {
        const alias = getDisplayAliasForRoom(room);
        const name = room.name || alias || _t('Unnamed room');

        let desc;
        if (alias) {
            desc = _t('Delete the room address %(alias)s and remove %(name)s from the directory?', {alias, name});
        } else {
            desc = _t('Remove %(name)s from the directory?', {name: name});
        }

        Modal.createTrackedDialog('Remove from Directory', '', QuestionDialog, {
            title: _t('Remove from Directory'),
            description: desc,
            onFinished: (shouldDelete: boolean) => {
                if (!shouldDelete) return;

                const modal = Modal.createDialog(Spinner);
                let step = _t('remove %(name)s from the directory.', {name: name});

                MatrixClientPeg.get().setRoomDirectoryVisibility(room.room_id, 'private').then(() => {
                    if (!alias) return;
                    step = _t('delete the address.');
                    return MatrixClientPeg.get().deleteAlias(alias);
                }).then(() => {
                    modal.close();
                    this.refreshRoomList();
                }, (err) => {
                    modal.close();
                    this.refreshRoomList();
                    console.error("Failed to " + step + ": " + err);
                    Modal.createTrackedDialog('Remove from Directory Error', '', ErrorDialog, {
                        title: _t('Error'),
                        description: (err && err.message)
                            ? err.message
                            : _t('The server may be unavailable or overloaded'),
                    });
                });
            },
        });
    }

    private onRoomClicked = (room: IRoom, ev: ButtonEvent) => {
        // If room was shift-clicked, remove it from the room directory
        if (ev.shiftKey && !this.state.selectedCommunityId) {
            ev.preventDefault();
            this.removeFromDirectory(room);
        }
    };

    private onOptionChange = (server: string, instanceId?: string | symbol) => {
        // clear next batch so we don't try to load more rooms
        this.nextBatch = null;
        this.setState({
            // Clear the public rooms out here otherwise we needlessly
            // spend time filtering lots of rooms when we're about to
            // to clear the list anyway.
            publicRooms: [],
            roomServer: server,
            instanceId: instanceId,
            error: null,
        }, this.refreshRoomList);
        // We also refresh the room list each time even though this
        // filtering is client-side. It hopefully won't be client side
        // for very long, and we may have fetched a thousand rooms to
        // find the five gitter ones, at which point we do not want
        // to render all those rooms when switching back to 'all networks'.
        // Easiest to just blow away the state & re-fetch.
    };

    private onFillRequest = (backwards: boolean) => {
        if (backwards || !this.nextBatch) return Promise.resolve(false);

        return this.getMoreRooms();
    };

    private onFilterChange = (alias: string) => {
        this.setState({
            filterString: alias || null,
        });

        // don't send the request for a little bit,
        // no point hammering the server with a
        // request for every keystroke, let the
        // user finish typing.
        if (this.filterTimeout) {
            clearTimeout(this.filterTimeout);
        }
        this.filterTimeout = setTimeout(() => {
            this.filterTimeout = null;
            this.refreshRoomList();
        }, 700);
    };

    private onFilterClear = () => {
        // update immediately
        this.setState({
            filterString: null,
        }, this.refreshRoomList);

        if (this.filterTimeout) {
            clearTimeout(this.filterTimeout);
        }
    };

    private onJoinFromSearchClick = (alias: string) => {
        // If we don't have a particular instance id selected, just show that rooms alias
        if (!this.state.instanceId || this.state.instanceId === ALL_ROOMS) {
            // If the user specified an alias without a domain, add on whichever server is selected
            // in the dropdown
            if (alias.indexOf(':') == -1) {
                alias = alias + ':' + this.state.roomServer;
            }
            this.showRoomAlias(alias, true);
        } else {
            // This is a 3rd party protocol. Let's see if we can join it
            const protocolName = protocolNameForInstanceId(this.protocols, this.state.instanceId);
            const instance = instanceForInstanceId(this.protocols, this.state.instanceId);
            const fields = protocolName
                ? this.getFieldsForThirdPartyLocation(alias, this.protocols[protocolName], instance)
                : null;
            if (!fields) {
                const brand = SdkConfig.get().brand;
                Modal.createTrackedDialog('Unable to join network', '', ErrorDialog, {
                    title: _t('Unable to join network'),
                    description: _t('%(brand)s does not know how to join a room on this network', { brand }),
                });
                return;
            }
            MatrixClientPeg.get().getThirdpartyLocation(protocolName, fields).then((resp) => {
                if (resp.length > 0 && resp[0].alias) {
                    this.showRoomAlias(resp[0].alias, true);
                } else {
                    Modal.createTrackedDialog('Room not found', '', ErrorDialog, {
                        title: _t('Room not found'),
                        description: _t('Couldn\'t find a matching Matrix room'),
                    });
                }
            }, (e) => {
                Modal.createTrackedDialog('Fetching third party location failed', '', ErrorDialog, {
                    title: _t('Fetching third party location failed'),
                    description: _t('Unable to look up room ID from server'),
                });
            });
        }
    };

    private onPreviewClick = (ev: ButtonEvent, room: IRoom) => {
        this.showRoom(room, null, false, true);
        ev.stopPropagation();
    };

    private onViewClick = (ev: ButtonEvent, room: IRoom) => {
        this.showRoom(room);
        ev.stopPropagation();
    };

    private onJoinClick = (ev: ButtonEvent, room: IRoom) => {
        this.showRoom(room, null, true);
        ev.stopPropagation();
    };

    private onCreateRoomClick = () => {
        this.onFinished();
        dis.dispatch({
            action: 'view_create_room',
            public: true,
            defaultName: this.state.filterString.trim(),
        });
    };

    private showRoomAlias(alias: string, autoJoin = false) {
        this.showRoom(null, alias, autoJoin);
    }

    private showRoom(room: IRoom, roomAlias?: string, autoJoin = false, shouldPeek = false) {
        this.onFinished();
        const payload: ActionPayload = {
            action: 'view_room',
            auto_join: autoJoin,
            should_peek: shouldPeek,
            _type: "room_directory", // instrumentation
        };
        if (room) {
            // Don't let the user view a room they won't be able to either
            // peek or join: fail earlier so they don't have to click back
            // to the directory.
            if (MatrixClientPeg.get().isGuest()) {
                if (!room.world_readable && !room.guest_can_join) {
                    dis.dispatch({action: 'require_registration'});
                    return;
                }
            }

            if (!roomAlias) {
                roomAlias = getDisplayAliasForRoom(room);
            }

            payload.oob_data = {
                avatarUrl: room.avatar_url,
                // XXX: This logic is duplicated from the JS SDK which
                // would normally decide what the name is.
                name: room.name || roomAlias || _t('Unnamed room'),
            };

            if (this.state.roomServer) {
                payload.via_servers = [this.state.roomServer];
                payload.opts = {
                    viaServers: [this.state.roomServer],
                };
            }
        }
        // It's not really possible to join Matrix rooms by ID because the HS has no way to know
        // which servers to start querying. However, there's no other way to join rooms in
        // this list without aliases at present, so if roomAlias isn't set here we have no
        // choice but to supply the ID.
        if (roomAlias) {
            payload.room_alias = roomAlias;
        } else {
            payload.room_id = room.room_id;
        }
        dis.dispatch(payload);
    }

    private createRoomCells(room: IRoom) {
        const client = MatrixClientPeg.get();
        const clientRoom = client.getRoom(room.room_id);
        const hasJoinedRoom = clientRoom && clientRoom.getMyMembership() === "join";
        const isGuest = client.isGuest();
        let previewButton;
        let joinOrViewButton;

        // Element Web currently does not allow guests to join rooms, so we
        // instead show them preview buttons for all rooms. If the room is not
        // world readable, a modal will appear asking you to register first. If
        // it is readable, the preview appears as normal.
        if (!hasJoinedRoom && (room.world_readable || isGuest)) {
            previewButton = (
                <AccessibleButton kind="secondary" onClick={(ev) => this.onPreviewClick(ev, room)}>
                    { _t("Preview") }
                </AccessibleButton>
            );
        }
        if (hasJoinedRoom) {
            joinOrViewButton = (
                <AccessibleButton kind="secondary" onClick={(ev) => this.onViewClick(ev, room)}>
                    { _t("View") }
                </AccessibleButton>
            );
        } else if (!isGuest) {
            joinOrViewButton = (
                <AccessibleButton kind="primary" onClick={(ev) => this.onJoinClick(ev, room)}>
                    { _t("Join") }
                </AccessibleButton>
            );
        }

        let name = room.name || getDisplayAliasForRoom(room) || _t('Unnamed room');
        if (name.length > MAX_NAME_LENGTH) {
            name = `${name.substring(0, MAX_NAME_LENGTH)}...`;
        }

        let topic = room.topic || '';
        // Additional truncation based on line numbers is done via CSS,
        // but to ensure that the DOM is not polluted with a huge string
        // we give it a hard limit before rendering.
        if (topic.length > MAX_TOPIC_LENGTH) {
            topic = `${topic.substring(0, MAX_TOPIC_LENGTH)}...`;
        }
        topic = linkifyAndSanitizeHtml(topic);
        let avatarUrl = null;
        if (room.avatar_url) avatarUrl = mediaFromMxc(room.avatar_url).getSquareThumbnailHttp(32);

        // We use onMouseDown instead of onClick, so that we can avoid text getting selected
        return [
            <div
                key={ `${room.room_id}_avatar` }
                onMouseDown={(ev) => this.onRoomClicked(room, ev)}
                className="mx_RoomDirectory_roomAvatar"
            >
                <BaseAvatar
                    width={32}
                    height={32}
                    resizeMethod='crop'
                    name={name}
                    idName={name}
                    url={avatarUrl}
                />
            </div>,
            <div
                key={ `${room.room_id}_description` }
                onMouseDown={(ev) => this.onRoomClicked(room, ev)}
                className="mx_RoomDirectory_roomDescription"
            >
                <div
                    className="mx_RoomDirectory_name"
                    onMouseDown={(ev) => this.onRoomClicked(room, ev)}
                >
                    { name }
                </div>&nbsp;
                <div
                    className="mx_RoomDirectory_topic"
                    onMouseDown={(ev) => this.onRoomClicked(room, ev)}
                    dangerouslySetInnerHTML={{ __html: topic }}
                />
                <div
                    className="mx_RoomDirectory_alias"
                    onMouseDown={(ev) => this.onRoomClicked(room, ev)}
                >
                    { getDisplayAliasForRoom(room) }
                </div>
            </div>,
            <div
                key={ `${room.room_id}_memberCount` }
                onMouseDown={(ev) => this.onRoomClicked(room, ev)}
                className="mx_RoomDirectory_roomMemberCount"
            >
                { room.num_joined_members }
            </div>,
            <div
                key={ `${room.room_id}_preview` }
                onMouseDown={(ev) => this.onRoomClicked(room, ev)}
                // cancel onMouseDown otherwise shift-clicking highlights text
                className="mx_RoomDirectory_preview"
            >
                { previewButton }
            </div>,
            <div
                key={ `${room.room_id}_join` }
                onMouseDown={(ev) => this.onRoomClicked(room, ev)}
                className="mx_RoomDirectory_join"
            >
                { joinOrViewButton }
            </div>,
        ];
    }

    private stringLooksLikeId(s: string, fieldType: IFieldType) {
        let pat = /^#[^\s]+:[^\s]/;
        if (fieldType && fieldType.regexp) {
            pat = new RegExp(fieldType.regexp);
        }

        return pat.test(s);
    }

    private getFieldsForThirdPartyLocation(userInput: string, protocol: IProtocol, instance: IInstance) {
        // make an object with the fields specified by that protocol. We
        // require that the values of all but the last field come from the
        // instance. The last is the user input.
        const requiredFields = protocol.location_fields;
        if (!requiredFields) return null;
        const fields = {};
        for (let i = 0; i < requiredFields.length - 1; ++i) {
            const thisField = requiredFields[i];
            if (instance.fields[thisField] === undefined) return null;
            fields[thisField] = instance.fields[thisField];
        }
        fields[requiredFields[requiredFields.length - 1]] = userInput;
        return fields;
    }

    private onFinished = () => {
        CountlyAnalytics.instance.trackRoomDirectory(this.startTime);
        this.props.onFinished(false);
    };

    render() {
        let content;
        if (this.state.error) {
            content = this.state.error;
        } else if (this.state.protocolsLoading) {
            content = <Spinner />;
        } else {
            const cells = (this.state.publicRooms || [])
                .reduce((cells, room) => cells.concat(this.createRoomCells(room)), []);
            // we still show the scrollpanel, at least for now, because
            // otherwise we don't fetch more because we don't get a fill
            // request from the scrollpanel because there isn't one

            let spinner;
            if (this.state.loading) {
                spinner = <Spinner />;
            }

            const createNewButton = <>
                <hr />
                <AccessibleButton kind="primary" onClick={this.onCreateRoomClick} className="mx_RoomDirectory_newRoom">
                    { _t("Create new room") }
                </AccessibleButton>
            </>;

            let scrollPanelContent;
            let footer;
            if (cells.length === 0 && !this.state.loading) {
                footer = <>
                    <h5>{ _t('No results for "%(query)s"', { query: this.state.filterString.trim() }) }</h5>
                    <p>
                        { _t("Try different words or check for typos. " +
                            "Some results may not be visible as they're private and you need an invite to join them.") }
                    </p>
                    { createNewButton }
                </>;
            } else {
                scrollPanelContent = <div className="mx_RoomDirectory_table">
                    { cells }
                </div>;
                if (!this.state.loading && !this.nextBatch) {
                    footer = createNewButton;
                }
            }
            content = <ScrollPanel
                className="mx_RoomDirectory_tableWrapper"
                onFillRequest={this.onFillRequest}
                stickyBottom={false}
                startAtBottom={false}
            >
                { scrollPanelContent }
                { spinner }
                { footer && <div className="mx_RoomDirectory_footer">
                    { footer }
                </div> }
            </ScrollPanel>;
        }

        let listHeader;
        if (!this.state.protocolsLoading) {
            const protocolName = protocolNameForInstanceId(this.protocols, this.state.instanceId);
            let instanceExpectedFieldType;
            if (
                protocolName &&
                this.protocols &&
                this.protocols[protocolName] &&
                this.protocols[protocolName].location_fields.length > 0 &&
                this.protocols[protocolName].field_types
            ) {
                const lastField = this.protocols[protocolName].location_fields.slice(-1)[0];
                instanceExpectedFieldType = this.protocols[protocolName].field_types[lastField];
            }

            let placeholder = _t('Find a room…');
            if (!this.state.instanceId || this.state.instanceId === ALL_ROOMS) {
                placeholder = _t("Find a room… (e.g. %(exampleRoom)s)", {
                    exampleRoom: "#example:" + this.state.roomServer,
                });
            } else if (instanceExpectedFieldType) {
                placeholder = instanceExpectedFieldType.placeholder;
            }

            let showJoinButton = this.stringLooksLikeId(this.state.filterString, instanceExpectedFieldType);
            if (protocolName) {
                const instance = instanceForInstanceId(this.protocols, this.state.instanceId);
                if (this.getFieldsForThirdPartyLocation(
                    this.state.filterString,
                    this.protocols[protocolName],
                    instance,
                ) === null) {
                    showJoinButton = false;
                }
            }

            let dropdown = (
                <NetworkDropdown
                    protocols={this.protocols}
                    onOptionChange={this.onOptionChange}
                    selectedServerName={this.state.roomServer}
                    selectedInstanceId={this.state.instanceId}
                />
            );
            if (this.state.selectedCommunityId) {
                dropdown = null;
            }

            listHeader = <div className="mx_RoomDirectory_listheader">
                <DirectorySearchBox
                    className="mx_RoomDirectory_searchbox"
                    onChange={this.onFilterChange}
                    onClear={this.onFilterClear}
                    onJoinClick={this.onJoinFromSearchClick}
                    placeholder={placeholder}
                    showJoinButton={showJoinButton}
                    initialText={this.props.initialText}
                />
                {dropdown}
            </div>;
        }
        const explanation =
            _t("If you can't find the room you're looking for, ask for an invite or <a>Create a new room</a>.", null,
                {a: sub => (
                    <AccessibleButton kind="secondary" onClick={this.onCreateRoomClick}>
                        { sub }
                    </AccessibleButton>
                )},
            );

        const title = this.state.selectedCommunityId
            ? _t("Explore rooms in %(communityName)s", {
                communityName: this.state.communityName || this.state.selectedCommunityId,
            }) : _t("Explore rooms");
        return (
            <BaseDialog
                className={'mx_RoomDirectory_dialog'}
                hasCancel={true}
                onFinished={this.onFinished}
                title={title}
            >
                <div className="mx_RoomDirectory">
                    {explanation}
                    <div className="mx_RoomDirectory_list">
                        {listHeader}
                        {content}
                    </div>
                </div>
            </BaseDialog>
        );
    }
}

// Similar to matrix-react-sdk's MatrixTools.getDisplayAliasForRoom
// but works with the objects we get from the public room list
function getDisplayAliasForRoom(room: IRoom) {
    return room.canonical_alias || room.aliases?.[0] || "";
}
