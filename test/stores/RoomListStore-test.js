import peg from '../../src/MatrixClientPeg';
import * as testUtils from '../test-utils';
import RoomListStore from "../../src/stores/RoomListStore";

const dispatch = testUtils.getDispatchForStore(RoomListStore);

describe('RoomListStore', function() {
    let clientSandbox;
    let settingsRef;

    let rooms = [];

    beforeEach(function() {
        testUtils.beforeEach(this);
        clientSandbox = testUtils.stubClient();
        settingsRef = testUtils.stubSettings();
        peg.get().credentials = {userId: "@test:example.com"};

        // Use our own room lookups so we can stub all the things
        rooms = [];
        peg.get().getRoom = (roomId) => rooms.find((r) => r.roomId === roomId);

        // Reset the state of the store
        RoomListStore.reset();
    });

    afterEach(function() {
        clientSandbox.restore();
        settingsRef.reset();
    });

    function createRoomWithCategory(category, tags) {
        // TODO: Create stubbed room
        // TODO: Make the room match the category
        // TODO: Figure out how to safely stub static classes without a bunch of hacks
    }

    describe('order by importance', function() {
        // General case for "does it work"
        it('sorts rooms by category then by activity', function() {

        });

        // We set this up as RED, STICKY, RED, RED and see what happens if we add a RED
        it('does not move the sticky room when categories change', function() {

        });

        // We set this up as RED, STICKY, RED, RED and see what happens when we make the later 2 REDs more active
        it('does not move the sticky room when activity changes', function() {

        });

        it('inserts invites into the invites section', function() {

        });

        it('inserts joins into the recents section', function() {

        });

        it('inserts leaves into the archived section', function() {

        });

        it('inserts direct chats into the people section', function() {

        });

        it('moves rooms to favourites when they are flagged as such', function() {

        });

        it('moves rooms to low priority when they flagged as such', function() {

        });

        // Recents -> New tag
        it('moves rooms to custom tags when they are tagged', function() {

        });

        // Recents -> Existing tag
        it('moves rooms to existing custom tags when they are tagged', function() {

        });

        // Existing tag -> Existing tag
        it('moves rooms to between tags when the room changes tags', function() {

        });

        // Existing tag -> New tag
        it('moves rooms to new tags when the room changes tags', function() {

        });

        // Existing tag -> Recents
        it('moves rooms to the recents section when they are untagged', function() {

        });

        it('orders custom tags by the user-defined order', function() {

        });

        it('duplicates rooms in tags if they are duplicated among tags', function() {

        });

        it('does not move rooms to custom tags when they are disabled', function() {

        });

        // GREY -> RED where both GREY and RED still have rooms
        it('moves rooms higher in the list when they change categories', function() {

        });

        // GREY -> RED where RED doesn't currently have any rooms
        it('moves rooms higher when they change to categories which previously did not have rooms', function() {

        });

        it('moves rooms lower when they are marked as read on other devices', function() {

        });

        it('moves rooms lower when the sticky room changes', function() {

        });
    });
});
