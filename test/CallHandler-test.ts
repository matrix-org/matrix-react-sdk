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

import { IProtocol } from 'matrix-js-sdk/src/matrix';
import { CallEvent, CallState, CallType } from 'matrix-js-sdk/src/webrtc/call';
import EventEmitter from 'events';
import { mocked } from 'jest-mock';

import CallHandler, {
    CallHandlerEvent, PROTOCOL_PSTN, PROTOCOL_PSTN_PREFIXED, PROTOCOL_SIP_NATIVE, PROTOCOL_SIP_VIRTUAL,
} from '../src/CallHandler';
import { stubClient, mkStubRoom, untilDispatch } from './test-utils';
import { MatrixClientPeg } from '../src/MatrixClientPeg';
import DMRoomMap from '../src/utils/DMRoomMap';
import SdkConfig from '../src/SdkConfig';
import { Action } from "../src/dispatcher/actions";
import { getFunctionalMembers } from "../src/utils/room/getFunctionalMembers";

jest.mock("../src/utils/room/getFunctionalMembers", () => ({
    getFunctionalMembers: jest.fn(),
}));

// The Matrix IDs that the user sees when talking to Alice & Bob
const NATIVE_ALICE = "@alice:example.org";
const NATIVE_BOB = "@bob:example.org";
const NATIVE_CHARLIE = "@charlie:example.org";

// Virtual user for Bob
const VIRTUAL_BOB = "@virtual_bob:example.org";

//const REAL_ROOM_ID = "$room1:example.org";
// The rooms the user sees when they're communicating with these users
const NATIVE_ROOM_ALICE = "$alice_room:example.org";
const NATIVE_ROOM_BOB = "$bob_room:example.org";
const NATIVE_ROOM_CHARLIE = "$charlie_room:example.org";

const FUNCTIONAL_USER = "@bot:example.com";

// The room we use to talk to virtual Bob (but that the user does not see)
// Bob has a virtual room, but Alice doesn't
const VIRTUAL_ROOM_BOB = "$virtual_bob_room:example.org";

// Bob's phone number
const BOB_PHONE_NUMBER = "01818118181";

function mkStubDM(roomId, userId) {
    const room = mkStubRoom(roomId, 'room', MatrixClientPeg.get());
    room.getJoinedMembers = jest.fn().mockReturnValue([
        {
            userId: '@me:example.org',
            name: 'Member',
            rawDisplayName: 'Member',
            roomId: roomId,
            membership: 'join',
            getAvatarUrl: () => 'mxc://avatar.url/image.png',
            getMxcAvatarUrl: () => 'mxc://avatar.url/image.png',
        },
        {
            userId: userId,
            name: 'Member',
            rawDisplayName: 'Member',
            roomId: roomId,
            membership: 'join',
            getAvatarUrl: () => 'mxc://avatar.url/image.png',
            getMxcAvatarUrl: () => 'mxc://avatar.url/image.png',
        },
        {
            userId: FUNCTIONAL_USER,
            name: 'Bot user',
            rawDisplayName: 'Bot user',
            roomId: roomId,
            membership: 'join',
            getAvatarUrl: () => 'mxc://avatar.url/image.png',
            getMxcAvatarUrl: () => 'mxc://avatar.url/image.png',
        },
    ]);
    room.currentState.getMembers = room.getJoinedMembers;
    return room;
}

class FakeCall extends EventEmitter {
    roomId: string;
    callId = "fake call id";

    constructor(roomId: string) {
        super();

        this.roomId = roomId;
    }

    setRemoteOnHold() {}
    setRemoteAudioElement() {}

    placeVoiceCall() {
        this.emit(CallEvent.State, CallState.Connected, null);
    }
}

function untilCallHandlerEvent(callHandler: CallHandler, event: CallHandlerEvent): Promise<void> {
    return new Promise<void>((resolve) => {
        callHandler.addListener(event, () => {
            resolve();
        });
    });
}

describe('CallHandler', () => {
    let dmRoomMap;
    let callHandler;
    let audioElement: HTMLAudioElement;
    let fakeCall;

    // what addresses the app has looked up via pstn and native lookup
    let pstnLookup: string;
    let nativeLookup: string;

    beforeEach(async () => {
        stubClient();
        MatrixClientPeg.get().createCall = roomId => {
            if (fakeCall && fakeCall.roomId !== roomId) {
                throw new Error("Only one call is supported!");
            }
            fakeCall = new FakeCall(roomId);
            return fakeCall;
        };

        MatrixClientPeg.get().getThirdpartyProtocols = () => {
            return Promise.resolve({
                "m.id.phone": {} as IProtocol,
                "im.vector.protocol.sip_native": {} as IProtocol,
                "im.vector.protocol.sip_virtual": {} as IProtocol,
            });
        };

        callHandler = new CallHandler();
        callHandler.start();

        mocked(getFunctionalMembers).mockReturnValue([
            FUNCTIONAL_USER,
        ]);

        const nativeRoomAlice = mkStubDM(NATIVE_ROOM_ALICE, NATIVE_ALICE);
        const nativeRoomBob = mkStubDM(NATIVE_ROOM_BOB, NATIVE_BOB);
        const nativeRoomCharie = mkStubDM(NATIVE_ROOM_CHARLIE, NATIVE_CHARLIE);
        const virtualBobRoom = mkStubDM(VIRTUAL_ROOM_BOB, VIRTUAL_BOB);

        MatrixClientPeg.get().getRoom = roomId => {
            switch (roomId) {
                case NATIVE_ROOM_ALICE:
                    return nativeRoomAlice;
                case NATIVE_ROOM_BOB:
                    return nativeRoomBob;
                case NATIVE_ROOM_CHARLIE:
                    return nativeRoomCharie;
                case VIRTUAL_ROOM_BOB:
                    return virtualBobRoom;
            }
        };

        dmRoomMap = {
            getUserIdForRoomId: (roomId: string) => {
                if (roomId === NATIVE_ROOM_ALICE) {
                    return NATIVE_ALICE;
                } else if (roomId === NATIVE_ROOM_BOB) {
                    return NATIVE_BOB;
                } else if (roomId === NATIVE_ROOM_CHARLIE) {
                    return NATIVE_CHARLIE;
                } else if (roomId === VIRTUAL_ROOM_BOB) {
                    return VIRTUAL_BOB;
                } else {
                    return null;
                }
            },
            getDMRoomsForUserId: (userId: string) => {
                if (userId === NATIVE_ALICE) {
                    return [NATIVE_ROOM_ALICE];
                } else if (userId === NATIVE_BOB) {
                    return [NATIVE_ROOM_BOB];
                } else if (userId === NATIVE_CHARLIE) {
                    return [NATIVE_ROOM_CHARLIE];
                } else if (userId === VIRTUAL_BOB) {
                    return [VIRTUAL_ROOM_BOB];
                } else {
                    return [];
                }
            },
        };
        DMRoomMap.setShared(dmRoomMap);

        pstnLookup = null;
        nativeLookup = null;

        MatrixClientPeg.get().getThirdpartyUser = (proto, params) => {
            if ([PROTOCOL_PSTN, PROTOCOL_PSTN_PREFIXED].includes(proto)) {
                pstnLookup = params['m.id.phone'];
                return Promise.resolve([{
                    userid: VIRTUAL_BOB,
                    protocol: "m.id.phone",
                    fields: {
                        is_native: true,
                        lookup_success: true,
                    },
                }]);
            } else if (proto === PROTOCOL_SIP_NATIVE) {
                nativeLookup = params['virtual_mxid'];
                if (params['virtual_mxid'] === VIRTUAL_BOB) {
                    return Promise.resolve([{
                        userid: NATIVE_BOB,
                        protocol: "im.vector.protocol.sip_native",
                        fields: {
                            is_native: true,
                            lookup_success: true,
                        },
                    }]);
                }
                return Promise.resolve([]);
            } else if (proto === PROTOCOL_SIP_VIRTUAL) {
                if (params['native_mxid'] === NATIVE_BOB) {
                    return Promise.resolve([{
                        userid: VIRTUAL_BOB,
                        protocol: "im.vector.protocol.sip_virtual",
                        fields: {
                            is_virtual: true,
                            lookup_success: true,
                        },
                    }]);
                }
                return Promise.resolve([]);
            }
        };

        audioElement = document.createElement('audio');
        audioElement.id = "remoteAudio";
        document.body.appendChild(audioElement);
    });

    afterEach(() => {
        callHandler.stop();
        DMRoomMap.setShared(null);
        // @ts-ignore
        window.mxCallHandler = null;
        fakeCall = null;
        MatrixClientPeg.unset();

        document.body.removeChild(audioElement);
        SdkConfig.unset();
    });

    it('should look up the correct user and start a call in the room when a phone number is dialled', async () => {
        await callHandler.dialNumber(BOB_PHONE_NUMBER);

        expect(pstnLookup).toEqual(BOB_PHONE_NUMBER);
        expect(nativeLookup).toEqual(VIRTUAL_BOB);

        // we should have switched to the native room for Bob
        const viewRoomPayload = await untilDispatch(Action.ViewRoom);
        expect(viewRoomPayload.room_id).toEqual(NATIVE_ROOM_BOB);

        // Check that a call was started: its room on the protocol level
        // should be the virtual room
        expect(fakeCall.roomId).toEqual(VIRTUAL_ROOM_BOB);

        // but it should appear to the user to be in thw native room for Bob
        expect(callHandler.roomIdForCall(fakeCall)).toEqual(NATIVE_ROOM_BOB);
    });

    it('should look up the correct user and start a call in the room when a call is transferred', async () => {
        // we can pass a very minimal object as as the call since we pass consultFirst=true:
        // we don't need to actually do any transferring
        const mockTransferreeCall = { type: CallType.Voice };
        await callHandler.startTransferToPhoneNumber(mockTransferreeCall, BOB_PHONE_NUMBER, true);

        // same checks as above
        const viewRoomPayload = await untilDispatch(Action.ViewRoom);
        expect(viewRoomPayload.room_id).toEqual(NATIVE_ROOM_BOB);

        expect(fakeCall.roomId).toEqual(VIRTUAL_ROOM_BOB);

        expect(callHandler.roomIdForCall(fakeCall)).toEqual(NATIVE_ROOM_BOB);
    });

    it('should move calls between rooms when remote asserted identity changes', async () => {
        callHandler.placeCall(NATIVE_ROOM_ALICE, CallType.Voice);

        await untilCallHandlerEvent(callHandler, CallHandlerEvent.CallState);

        // We placed the call in Alice's room so it should start off there
        expect(callHandler.getCallForRoom(NATIVE_ROOM_ALICE)).toBe(fakeCall);

        let callRoomChangeEventCount = 0;
        const roomChangePromise = new Promise<void>(resolve => {
            callHandler.addListener(CallHandlerEvent.CallChangeRoom, () => {
                ++callRoomChangeEventCount;
                resolve();
            });
        });

        // Now emit an asserted identity for Bob: this should be ignored
        // because we haven't set the config option to obey asserted identity
        fakeCall.getRemoteAssertedIdentity = jest.fn().mockReturnValue({
            id: NATIVE_BOB,
        });
        fakeCall.emit(CallEvent.AssertedIdentityChanged);

        // Now set the config option
        SdkConfig.add({
            voip: {
                obey_asserted_identity: true,
            },
        });

        // ...and send another asserted identity event for a different user
        fakeCall.getRemoteAssertedIdentity = jest.fn().mockReturnValue({
            id: NATIVE_CHARLIE,
        });
        fakeCall.emit(CallEvent.AssertedIdentityChanged);

        await roomChangePromise;
        callHandler.removeAllListeners();

        // If everything's gone well, we should have seen only one room change
        // event and the call should now be in Charlie's room.
        // If it's not obeying any, the call will still be in NATIVE_ROOM_ALICE.
        // If it incorrectly obeyed both asserted identity changes, either it will
        // have just processed one and the call will be in the wrong room, or we'll
        // have seen two room change dispatches.
        expect(callRoomChangeEventCount).toEqual(1);
        expect(callHandler.getCallForRoom(NATIVE_ROOM_BOB)).toBeNull();
        expect(callHandler.getCallForRoom(NATIVE_ROOM_CHARLIE)).toBe(fakeCall);
    });
});

describe('CallHandler without third party protocols', () => {
    let dmRoomMap;
    let callHandler: CallHandler;
    let audioElement: HTMLAudioElement;
    let fakeCall;

    beforeEach(() => {
        stubClient();
        MatrixClientPeg.get().createCall = roomId => {
            if (fakeCall && fakeCall.roomId !== roomId) {
                throw new Error("Only one call is supported!");
            }
            fakeCall = new FakeCall(roomId);
            return fakeCall;
        };

        MatrixClientPeg.get().getThirdpartyProtocols = () => {
            throw new Error("Endpoint unsupported.");
        };

        callHandler = new CallHandler();
        callHandler.start();

        const nativeRoomAlice = mkStubDM(NATIVE_ROOM_ALICE, NATIVE_ALICE);

        MatrixClientPeg.get().getRoom = roomId => {
            switch (roomId) {
                case NATIVE_ROOM_ALICE:
                    return nativeRoomAlice;
            }
        };

        dmRoomMap = {
            getUserIdForRoomId: (roomId: string) => {
                if (roomId === NATIVE_ROOM_ALICE) {
                    return NATIVE_ALICE;
                } else {
                    return null;
                }
            },
            getDMRoomsForUserId: (userId: string) => {
                if (userId === NATIVE_ALICE) {
                    return [NATIVE_ROOM_ALICE];
                } else {
                    return [];
                }
            },
        };
        DMRoomMap.setShared(dmRoomMap);

        MatrixClientPeg.get().getThirdpartyUser = (_proto, _params) => {
            throw new Error("Endpoint unsupported.");
        };

        audioElement = document.createElement('audio');
        audioElement.id = "remoteAudio";
        document.body.appendChild(audioElement);
    });

    afterEach(() => {
        callHandler.stop();
        DMRoomMap.setShared(null);
        // @ts-ignore
        window.mxCallHandler = null;
        fakeCall = null;
        MatrixClientPeg.unset();

        document.body.removeChild(audioElement);
        SdkConfig.unset();
    });

    it('should still start a native call', async () => {
        callHandler.placeCall(NATIVE_ROOM_ALICE, CallType.Voice);

        await untilCallHandlerEvent(callHandler, CallHandlerEvent.CallState);

        // Check that a call was started: its room on the protocol level
        // should be the virtual room
        expect(fakeCall.roomId).toEqual(NATIVE_ROOM_ALICE);

        // but it should appear to the user to be in thw native room for Bob
        expect(callHandler.roomIdForCall(fakeCall)).toEqual(NATIVE_ROOM_ALICE);
    });
});
