/*
Copyright 2024 The Matrix.org Foundation C.I.C.

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
import { throttle } from "lodash";
import { useCallback, useContext, useEffect, useRef } from "react";
import { BehaviorSubject, Observable } from "rxjs";
import { useObservableEagerState } from "observable-hooks";
import { RoomStateEvent } from "matrix-js-sdk/src/matrix";

import { IMemberService } from "../../../services/rooms/memberlist/IMemberService";
import { useMatrixClientContext } from "../../../contexts/MatrixClientContext";
import { SDKContext } from "../../../contexts/SDKContext";
import { useEventEmitterState } from "../../../hooks/useEventEmitter";
import { canInviteTo } from "../../../utils/room/canInviteTo";
import { MemberService } from "../../../services/rooms/memberlist/MemberService";
import { RoomMember } from "../../../models/rooms/RoomMember";

const INITIAL_LOAD_NUM_MEMBERS = 30;
const INITIAL_LOAD_NUM_INVITED = 5;
const SHOW_MORE_INCREMENT = 100;

export interface MemberListViewModelHook {
    loading: boolean;
    members: RoomMember[];
    showInvite: boolean;
    enableInvite: boolean;
    searchQuery?: string;
    setUp(): Promise<void>;
    tearDown(): void;
    onSearchQueryChanged(query: string): Promise<void>;
}
class MemberListViewModel {
    private memberService: IMemberService;
    private _members = new BehaviorSubject<RoomMember[]>([]);
    private _searchQuery = new BehaviorSubject<string | undefined>(undefined);
    private _showPresence = new BehaviorSubject(true);
    private _loading = new BehaviorSubject(true);
    private _truncateAtJoined = new BehaviorSubject(INITIAL_LOAD_NUM_MEMBERS);
    private _truncateAtInvited = new BehaviorSubject(INITIAL_LOAD_NUM_INVITED);

    public readonly searchQuery: Observable<string | undefined> = this._searchQuery;
    public readonly loading: Observable<boolean> = this._loading;
    public readonly showPresence: Observable<boolean> = this._showPresence;
    public readonly truncateAtJoined: Observable<number> = this._truncateAtJoined;
    public readonly truncateAtInvited: Observable<number> = this._truncateAtInvited;
    public readonly members: Observable<RoomMember[]> = this._members;

    public constructor(memberService: IMemberService) {
        this.memberService = memberService;
    }

    public async load(): Promise<void> {
        if (!this.memberService) return;
        this.memberService.setOnMemberListUpdated((reload) => this.onMembersUpdated(reload));
        this.memberService.setOnPresenceUpdated((userId) => this.onPresenceUpdated(userId));
        this.memberService.load();
        this._showPresence.next(this.memberService.showPresence());
        await this.loadMembersNow(true);
    }

    public unload(): void {
        this.throttleLoadMembers.cancel();
        this.memberService?.unload();
    }

    private onPresenceUpdated(userId: string): void {
        this.throttleLoadMembers();
    }

    private onMembersUpdated(reload: boolean): void {
        if (reload) {
            this.loadMembersNow(true);
        } else {
            this.throttleLoadMembers();
        }
    }

    private throttleLoadMembers = throttle(
        () => {
            this.loadMembersNow(false);
        },
        500,
        { leading: true, trailing: true },
    );

    private async loadMembersNow(showLoadingSpinner: boolean, query?: string): Promise<void> {
        if (!this.memberService) return;

        if (showLoadingSpinner) {
            this._loading.next(true);
        }
        const { joined } = await this.memberService.loadMembers(query);
        this._loading.next(false);
        this._members.next(joined);
    }

    public shouldShowInvite(): boolean {
        return this.memberService.shouldShowInvite();
    }

    public async onSearchQueryChanged(query: string): Promise<void> {
        this._searchQuery.next(query);
        this.loadMembersNow(false, query);
    }

    public showMoreJoinedMemberList(): void {
        this._truncateAtJoined.next(this._truncateAtJoined.value + SHOW_MORE_INCREMENT);
    }

    public showMoreInvitedMemberList(): void {
        this._truncateAtInvited.next(this._truncateAtInvited.value + SHOW_MORE_INCREMENT);
    }
}

export function useMemberListViewModel(roomId: string): MemberListViewModelHook {
    const cli = useMatrixClientContext();
    const room = cli.getRoom(roomId);
    const sdkContext = useContext(SDKContext);
    const canInviteToState = useEventEmitterState(
        room || undefined,
        RoomStateEvent.Update,
        () => !!room && canInviteTo(room),
    );
    const vm = useRef<MemberListViewModel>();

    const getMemberListViewModel = useCallback((): MemberListViewModel => {
        if (!!vm.current) {
            return vm.current!;
        }
        const memberService = new MemberService(roomId, cli, sdkContext.memberListStore);
        const viewModel = new MemberListViewModel(memberService);
        vm.current = viewModel;
        return viewModel;
    }, [roomId, cli, sdkContext.memberListStore]);

    useEffect(() => {
        const viewModel = getMemberListViewModel();
        viewModel.load();
        return () => {
            viewModel.unload();
            vm.current = undefined;
        };
    }, [getMemberListViewModel]);

    const viewModel = getMemberListViewModel();
    return {
        members: useObservableEagerState(viewModel.members),
        loading: useObservableEagerState(viewModel.loading),
        setUp: () => viewModel.load(),
        tearDown: () => viewModel.unload(),
        showInvite: viewModel.shouldShowInvite(),
        enableInvite: canInviteToState,
        searchQuery: useObservableEagerState(viewModel.searchQuery),
        onSearchQueryChanged: (query) => viewModel.onSearchQueryChanged(query),
    };
}

export class MockMemberListViewModelHook implements MemberListViewModelHook {
    public loading: boolean = false;
    public members: RoomMember[] = [];
    public showInvite: boolean = true;
    public enableInvite: boolean = true;
    public searchQuery?: string | undefined = undefined;

    constructor() {
        this.members = [...Array(100).keys()].map((i): RoomMember => {
            return {
                roomId: "1",
                userId: `${i}`,
                displayUserId: `${i}`,
                name: `Room Member ${i}`,
                rawDisplayName: `Room Member ${i}`,
                disambiguate: false,
                avatarThumbnailUrl: undefined,
                powerLevel: 100,
                lastModifiedTime: 0,
                presence: undefined,
            };
        });
    }
    public setUp(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    public tearDown(): void {
        throw new Error("Method not implemented.");
    }

    public onSearchQueryChanged(query: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
}
