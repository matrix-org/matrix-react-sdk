/*
Copyright 2023 The Matrix.org Foundation C.I.C.

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

/*
 * # High Level Read Receipt Tests
 *
 * Tips for writing these tests:
 *
 * * Break up your tests into the smallest test case possible. The purpose of
 *   these tests is to understand hard-to-find bugs, so small tests are necessary.
 *   We know that Cypress recommends combining tests together for performance, but
 *   that will frustrate our goals here. (We will need to find a different way to
 *   reduce CI time.)
 *
 * * Try to assert something after every action, to make sure it has completed.
 *   E.g.:
 *   markAsRead(room2);
 *   assertRead(room2);
 *   You should especially follow this rule if you are jumping to a different
 *   room or similar straight afterwards.
 *
 * * Use assertStillRead() if you are asserting something is read when it was
 *   also read before. This waits a little while to make sure you're not getting a
 *   false positive.
 */

/// <reference types="cypress" />

import type { MatrixClient } from "matrix-js-sdk/src/matrix";
import { HomeserverInstance } from "../../plugins/utils/homeserver";
import {
    assertRead,
    assertReadThread,
    assertStillRead,
    assertUnread,
    assertUnreadLessThan,
    assertUnreadThread,
    backToThreadsList,
    BotActionSpec,
    goTo,
    many,
    markAsRead,
    Message,
    MessageContentSpec,
    MessageFinder,
    openThread,
    saveAndReload,
    sendMessageAsClient,
} from "./read-receipts-utils";

describe("Read receipts 1", () => {
    const userName = "Mae";
    const botName = "Other User";
    const roomAlpha = "Room Alpha";
    const roomBeta = "Room Beta";

    let homeserver: HomeserverInstance;
    let betaRoomId: string;
    let alphaRoomId: string;
    let bot: MatrixClient | undefined;

    let messageFinder: MessageFinder;

    function editOf(originalMessage: string, newMessage: string): MessageContentSpec {
        return messageFinder.editOf(originalMessage, newMessage);
    }

    function replyTo(targetMessage: string, newMessage: string): MessageContentSpec {
        return messageFinder.replyTo(targetMessage, newMessage);
    }

    function threadedOff(rootMessage: string, newMessage: string): MessageContentSpec {
        return messageFinder.threadedOff(rootMessage, newMessage);
    }

    function manyThreadedOff(rootMessage: string, newMessages: Array<string>): Array<MessageContentSpec> {
        return messageFinder.manyThreadedOff(rootMessage, newMessages);
    }

    function reactionTo(targetMessage: string, reaction: string): BotActionSpec {
        return messageFinder.reactionTo(targetMessage, reaction);
    }

    function jumpTo(room: string, message: string, includeThreads = false) {
        return messageFinder.jumpTo(room, message, includeThreads);
    }

    before(() => {
        // Note: unusually for the Cypress tests in this repo, we share a single
        // Synapse between all the tests in this file.
        //
        // Stopping and starting Synapse costs about 0.25 seconds per test, so
        // for most suites this is worth the cost for the extra assurance that
        // each test is independent.
        //
        // Because there are so many tests in this file, and because sharing a
        // Synapse should have no effect (because we create new rooms and users
        // for each test), we share it here, saving ~30 seconds per run at time
        // of writing.

        cy.startHomeserver("default").then((data) => {
            homeserver = data;
        });
    });

    beforeEach(() => {
        messageFinder = new MessageFinder();

        // Create 2 rooms: Alpha & Beta. We join the bot to both of them
        cy.initTestUser(homeserver, userName)
            .then(() => {
                cy.createRoom({ name: roomAlpha }).then((createdRoomId) => {
                    alphaRoomId = createdRoomId;
                });
            })
            .then(() => {
                cy.createRoom({ name: roomBeta }).then((createdRoomId) => {
                    betaRoomId = createdRoomId;
                });
            })
            .then(() => {
                cy.getBot(homeserver, { displayName: botName }).then((botClient) => {
                    bot = botClient;
                });
            })
            .then(() => {
                // Invite the bot to both rooms
                cy.inviteUser(alphaRoomId, bot.getUserId());
                cy.viewRoomById(alphaRoomId);
                cy.findByText(botName + " joined the room").should("exist");

                cy.inviteUser(betaRoomId, bot.getUserId());
                cy.viewRoomById(betaRoomId);
                cy.findByText(botName + " joined the room").should("exist");
            });
    });

    after(() => {
        cy.stopHomeserver(homeserver);
    });

    /**
     * Sends messages into given room as a bot
     * @param room - the name of the room to send messages into
     * @param messages - the list of messages to send, these can be strings or implementations of MessageSpec like `editOf`
     */
    function receiveMessages(room: string, messages: Message[]) {
        sendMessageAsClient(bot, room, messages);
    }

    /**
     * Sends messages into given room as the currently logged-in user
     * @param room - the name of the room to send messages into
     * @param messages - the list of messages to send, these can be strings or implementations of MessageSpec like `editOf`
     */
    function sendMessages(room: string, messages: Message[]) {
        cy.getClient().then((cli) => sendMessageAsClient(cli, room, messages));
    }

    const room1 = roomAlpha;
    const room2 = roomBeta;

    describe("new messages", () => {
        describe("in the main timeline", () => {
            it("Receiving a message makes a room unread", () => {
                // Given I am in a different room
                goTo(room1);
                assertRead(room2);

                // When I receive some messages
                receiveMessages(room2, ["Msg1"]);

                // Then the room is marked as unread
                assertUnread(room2, 1);
            });
            it("Reading latest message makes the room read", () => {
                // Given I have some unread messages
                goTo(room1);
                assertRead(room2);
                receiveMessages(room2, ["Msg1"]);
                assertUnread(room2, 1);

                // When I read the main timeline
                goTo(room2);

                // Then the room becomes read
                assertRead(room2);
            });
            // XXX: fails (sometimes!) because the unread count stays high
            it.skip("Reading an older message leaves the room unread", () => {
                // Given there are lots of messages in a room
                goTo(room1);
                receiveMessages(room2, many("Msg", 30));
                assertUnread(room2, 30);

                // When I jump to one of the older messages
                jumpTo(room2, "Msg1");

                // Then the room is still unread, but some messages were read
                assertUnreadLessThan(room2, 30);
            });
            it("Marking a room as read makes it read", () => {
                // Given I have some unread messages
                goTo(room1);
                assertRead(room2);
                receiveMessages(room2, ["Msg1"]);
                assertUnread(room2, 1);

                // When I mark the room as read
                markAsRead(room2);

                // Then it is read
                assertRead(room2);
            });
            it("Receiving a new message after marking as read makes it unread", () => {
                // Given I have marked my messages as read
                goTo(room1);
                assertRead(room2);
                receiveMessages(room2, ["Msg1"]);
                assertUnread(room2, 1);
                markAsRead(room2);
                assertRead(room2);

                // When I receive a new message
                receiveMessages(room2, ["Msg2"]);

                // Then the room is unread
                assertUnread(room2, 1);
            });
            it("A room with a new message is still unread after restart", () => {
                // Given I have an unread message
                goTo(room1);
                assertRead(room2);
                receiveMessages(room2, ["Msg1"]);
                assertUnread(room2, 1);

                // When I restart
                saveAndReload();

                // Then I still have an unread message
                assertUnread(room2, 1);
            });
            it("A room where all messages are read is still read after restart", () => {
                // Given I have read all messages
                goTo(room1);
                assertRead(room2);
                receiveMessages(room2, ["Msg1"]);
                assertUnread(room2, 1);
                goTo(room2);
                assertRead(room2);

                // When I restart
                saveAndReload();

                // Then all messages are still read
                assertRead(room2);
            });
            it("A room that was marked as read is still read after restart", () => {
                // Given I have marked all messages as read
                goTo(room1);
                assertRead(room2);
                receiveMessages(room2, ["Msg1"]);
                assertUnread(room2, 1);
                markAsRead(room2);
                assertRead(room2);

                // When I restart
                saveAndReload();

                // Then all messages are still read
                assertRead(room2);
            });
            // XXX: fails because the room remains unread even though I sent a message
            it.skip("Me sending a message from a different client marks room as read", () => {
                // Given I have unread messages
                goTo(room1);
                assertRead(room2);
                receiveMessages(room2, ["Msg1"]);
                assertUnread(room2, 1);

                // When I send a new message from a different client
                sendMessages(room2, ["Msg2"]);

                // Then this room is marked as read
                assertRead(room2);
            });
        });

        describe("in threads", () => {
            it("Receiving a message makes a room unread", () => {
                // Given a message arrived and is read
                goTo(room1);
                receiveMessages(room2, ["Msg1"]);
                assertUnread(room2, 1);
                goTo(room2);
                assertRead(room2);
                goTo(room1);

                // When I receive a threaded message
                receiveMessages(room2, [threadedOff("Msg1", "Resp1")]);

                // Then the room becomes unread
                assertUnread(room2, 1);
            });
            it("Reading the last threaded message makes the room read", () => {
                // Given a thread exists and is not read
                goTo(room1);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Resp1")]);
                assertUnread(room2, 2);
                goTo(room2);

                // When I read it
                openThread("Msg1");

                // The room becomes read
                assertRead(room2);
            });
            it("Reading a thread message makes the thread read", () => {
                // Given a thread exists
                goTo(room1);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Resp1"), threadedOff("Msg1", "Resp2")]);
                assertUnread(room2, 3); // (Sanity)

                // When I read the main timeline
                goTo(room2);

                // Then room does appear unread
                assertUnread(room2, 2);

                // Until we open the thread
                openThread("Msg1");
                assertReadThread("Msg1");
                assertRead(room2);
            });
            it("Reading an older thread message leaves the thread unread", () => {
                // Given there are many messages in a thread
                goTo(room1);
                receiveMessages(room2, ["ThreadRoot", ...manyThreadedOff("ThreadRoot", many("InThread", 20))]);
                assertUnread(room2, 21);

                // When I read an older message in the thread
                jumpTo(room2, "InThread1", true);
                assertUnreadLessThan(room2, 21);
                // TODO: for some reason, we can't find the first message
                // "InThread0", so I am using the second here. Also, they appear
                // out of order, with "InThread2" before "InThread1". Might be a
                // clue to the sporadic reports we have had of messages going
                // missing in threads?

                // Then the thread is still marked as unread
                backToThreadsList();
                assertUnreadThread("ThreadRoot");
            });
            it("Reading only one thread's message does not make the room read", () => {
                // Given two threads are unread
                goTo(room1);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Resp1"), "Msg2", threadedOff("Msg2", "Resp2")]);
                assertUnread(room2, 4);
                goTo(room2);
                assertUnread(room2, 2);

                // When I only read one of them
                openThread("Msg1");

                // The room is still unread
                assertUnread(room2, 1);
            });
            it("Reading only one thread's message makes that thread read but not others", () => {
                // Given I have unread threads
                goTo(room1);
                receiveMessages(room2, ["Msg1", "Msg2", threadedOff("Msg1", "Resp1"), threadedOff("Msg2", "Resp2")]);
                assertUnread(room2, 4); // (Sanity)
                goTo(room2);
                assertUnread(room2, 2);
                assertUnreadThread("Msg1");
                assertUnreadThread("Msg2");

                // When I read one of them
                openThread("Msg1");

                // Then that one is read, but the other is not
                assertReadThread("Msg1");
                assertUnreadThread("Msg2");
            });
            it("Reading the main timeline does not mark a thread message as read", () => {
                // Given a thread exists
                goTo(room1);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Resp1"), threadedOff("Msg1", "Resp2")]);
                assertUnread(room2, 3); // (Sanity)

                // When I read the main timeline
                goTo(room2);
                assertUnread(room2, 2);

                // Then thread does appear unread
                assertUnreadThread("Msg1");
            });
            // XXX: fails because the room is still "bold" even though the notification counts all disappear
            it.skip("Marking a room with unread threads as read makes it read", () => {
                // Given I have an unread thread
                goTo(room1);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Resp1"), threadedOff("Msg1", "Resp2")]);
                assertUnread(room2, 3); // (Sanity)

                // When I mark the room as read
                markAsRead(room2);

                // Then the room is read
                assertRead(room2);
            });
            // XXX: fails for the same reason as "Marking a room with unread threads as read makes it read"
            it.skip("Sending a new thread message after marking as read makes it unread", () => {
                // Given a thread exists
                goTo(room1);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Resp1"), threadedOff("Msg1", "Resp2")]);

                // When I mark the room as read
                markAsRead(room2);
                assertRead(room2);

                // Then another message appears in the thread
                receiveMessages(room2, [threadedOff("Msg1", "Resp3")]);

                // Then the room becomes unread
                assertUnread(room2, 1);
            });
            // XXX: fails for the same reason as "Marking a room with unread threads as read makes it read"
            it.skip("Sending a new different-thread message after marking as read makes it unread", () => {
                // Given 2 threads exist, and Thread2 has the latest message in it
                goTo(room1);
                receiveMessages(room2, ["Thread1", "Thread2", threadedOff("Thread1", "t1a")]);
                assertUnread(room2, 3);
                receiveMessages(room2, [threadedOff("Thread2", "t2a")]);

                // When I mark the room as read (making an unthreaded receipt for t2a)
                markAsRead(room2);
                assertRead(room2);

                // Then another message appears in the other thread
                receiveMessages(room2, [threadedOff("Thread1", "t1b")]);

                // Then the room becomes unread
                assertUnread(room2, 1);
            });
            it("A room with a new threaded message is still unread after restart", () => {
                // Given a thread exists
                goTo(room1);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Resp1"), threadedOff("Msg1", "Resp2")]);
                assertUnread(room2, 3); // (Sanity)

                // When I read the main timeline
                goTo(room2);

                // Then room does appear unread
                assertUnread(room2, 2);

                saveAndReload();
                assertUnread(room2, 2);

                // Until we open the thread
                openThread("Msg1");
                assertRead(room2);
            });
            it("A room where all threaded messages are read is still read after restart", () => {
                // Given I have read all the threads
                goTo(room1);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Resp1"), threadedOff("Msg1", "Resp2")]);
                assertUnread(room2, 3); // (Sanity)
                goTo(room2);
                assertUnread(room2, 2);
                openThread("Msg1");
                assertRead(room2);

                // When I restart
                saveAndReload();

                // Then the room is still read
                assertRead(room2);
            });
        });

        describe("thread roots", () => {
            it("Reading a thread root does not mark the thread as read", () => {
                // Given a thread exists
                goTo(room1);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Resp1")]);
                assertUnread(room2, 2); // (Sanity)

                // When I read the main timeline
                goTo(room2);

                // Then room does appear unread
                assertUnread(room2, 1);
                assertUnreadThread("Msg1");
            });
            // XXX: fails because we jump to the wrong place in the timeline
            it.skip("Reading a thread root within the thread view marks it as read in the main timeline", () => {
                // Given lots of messages are on the main timeline, and one has a thread off it
                goTo(room1);
                receiveMessages(room2, [
                    ...many("beforeThread", 30),
                    "ThreadRoot",
                    threadedOff("ThreadRoot", "InThread"),
                    ...many("afterThread", 30),
                ]);
                assertUnread(room2, 62); // Sanity

                // When I jump to an old message and read the thread
                jumpTo(room2, "beforeThread0");
                openThread("ThreadRoot");

                // Then the thread root is marked as read in the main timeline,
                // so there are only 30 left - the ones after the thread root.
                assertUnread(room2, 30);
            });
            it("Creating a new thread based on a reply makes the room unread", () => {
                // Given a message and reply exist and are read
                goTo(room1);
                receiveMessages(room2, ["Msg1", replyTo("Msg1", "Reply1")]);
                goTo(room2);
                assertRead(room2);
                goTo(room1);
                assertRead(room2);

                // When I receive a thread message created on the reply
                receiveMessages(room2, [threadedOff("Reply1", "Resp1")]);

                // Then the room is unread
                assertUnread(room2, 1);
            });
            it("Reading a thread whose root is a reply makes the room read", () => {
                // Given an unread thread off a reply exists
                goTo(room1);
                receiveMessages(room2, ["Msg1", replyTo("Msg1", "Reply1"), threadedOff("Reply1", "Resp1")]);
                assertUnread(room2, 3);
                goTo(room2);
                assertUnread(room2, 1);
                assertUnreadThread("Reply1");

                // When I read the thread
                openThread("Reply1");

                // Then the room and thread are read
                assertRead(room2);
                assertReadThread("Reply1");
            });
        });
    });

    describe("editing messages", () => {
        describe("in the main timeline", () => {
            // TODO: this passes but we think this should fail, because we think edits should not cause unreads.
            // XXX: fails because we see a dot instead of an unread number - probably the server and client disagree
            it.skip("Editing a message makes a room unread", () => {
                // Given I am not looking at the room
                goTo(room1);

                receiveMessages(room2, ["Msg1"]);
                assertUnread(room2, 1);
                goTo(room2);
                assertRead(room2);
                goTo(room1);

                // When an edit appears in the room
                receiveMessages(room2, [editOf("Msg1", "Msg1 Edit1")]);

                // Then it becomes unread
                assertUnread(room2, 1);
            });
            // XXX: fails because we see a dot instead of an unread number - probably the server and client disagree
            it.skip("Reading an edit makes the room read", () => {
                // Given an edit is making the room unread
                goTo(room1);
                receiveMessages(room2, ["Msg1"]);
                assertUnread(room2, 1);

                goTo(room2);
                assertRead(room2);
                goTo(room1);

                receiveMessages(room2, [editOf("Msg1", "Msg1 Edit1")]);
                assertUnread(room2, 1);

                // When I read it
                goTo(room2);

                // Then the room becomes read and stays read
                assertRead(room2);
                goTo(room1);
                assertRead(room2);
            });
            it("Marking a room as read after an edit makes it read", () => {
                // Given an edit is making a room unread
                goTo(room2);
                receiveMessages(room2, ["Msg1"]);
                assertRead(room2);
                goTo(room1);
                receiveMessages(room2, [editOf("Msg1", "Msg1 Edit1")]);
                assertUnread(room2, 1);

                // When I mark it as read
                markAsRead(room2);

                // Then the room becomes read
                assertRead(room2);
            });
            // XXX: fails because we see a dot instead of an unread number - probably the server and client disagree
            it.skip("Editing a message after marking as read makes the room unread", () => {
                // Given the room is marked as read
                goTo(room1);
                receiveMessages(room2, ["Msg1"]);
                assertUnread(room2, 1);
                markAsRead(room2);
                assertRead(room2);

                // When a message is edited
                receiveMessages(room2, [editOf("Msg1", "Msg1 Edit1")]);

                // Then the room becomes unread
                assertUnread(room2, 1);
            });
            // XXX: fails because we see a dot instead of an unread number - probably the server and client disagree
            it.skip("Editing a reply after reading it makes the room unread", () => {
                // Given the room is all read
                goTo(room1);

                receiveMessages(room2, ["Msg1", replyTo("Msg1", "Reply1")]);
                assertUnread(room2, 2);

                goTo(room2);
                assertRead(room2);
                goTo(room1);

                // When a message is edited
                receiveMessages(room2, [editOf("Reply1", "Reply1 Edit1")]);

                // Then it becomes unread
                assertUnread(room2, 1);
            });
            // XXX: fails because we see a dot instead of an unread number - probably the server and client disagree
            it.skip("Editing a reply after marking as read makes the room unread", () => {
                // Given a reply is marked as read
                goTo(room1);
                receiveMessages(room2, ["Msg1", replyTo("Msg1", "Reply1")]);
                assertUnread(room2, 2);
                markAsRead(room2);
                assertRead(room2);

                // When the reply is edited
                receiveMessages(room2, [editOf("Reply1", "Reply1 Edit1")]);

                // Then the room becomes unread
                assertUnread(room2, 1);
            });
            // XXX: fails because we see a dot instead of an unread number - probably the server and client disagree
            it.skip("A room with an edit is still unread after restart", () => {
                // Given a message is marked as read
                goTo(room2);
                receiveMessages(room2, ["Msg1"]);
                assertRead(room2);
                goTo(room1);

                // When an edit appears in the room
                receiveMessages(room2, [editOf("Msg1", "Msg1 Edit1")]);

                // Then it becomes unread
                assertUnread(room2, 1);

                // And remains so after a reload
                saveAndReload();
                assertUnread(room2, 1);
            });
            it("An edited message becomes read if it happens while I am looking", () => {
                // Given a message is marked as read
                goTo(room2);
                receiveMessages(room2, ["Msg1"]);
                assertRead(room2);

                // When I see an edit appear in the room I am looking at
                receiveMessages(room2, [editOf("Msg1", "Msg1 Edit1")]);

                // Then it becomes read
                assertRead(room2);
            });
            it("A room where all edits are read is still read after restart", () => {
                // Given an edit made the room unread
                goTo(room2);
                receiveMessages(room2, ["Msg1"]);
                assertRead(room2);
                receiveMessages(room2, [editOf("Msg1", "Msg1 Edit1")]);
                assertUnread(room2, 1);

                // When I mark it as read
                markAsRead(room2);

                // Then the room becomes read
                assertRead(room2);

                // And remains so after a reload
                saveAndReload();
                assertRead(room2);
            });
        });

        describe("in threads", () => {
            // XXX: fails because we see a dot instead of an unread number - probably the server and client disagree
            it.skip("An edit of a threaded message makes the room unread", () => {
                // Given we have read the thread
                goTo(room1);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Resp1")]);
                assertUnread(room2, 2);
                goTo(room2);
                openThread("Msg1");
                assertRead(room2);
                backToThreadsList();
                goTo(room1);

                // When a message inside it is edited
                receiveMessages(room2, [editOf("Resp1", "Edit1")]);

                // Then the room and thread are unread
                assertUnread(room2, 1);
                goTo(room2);
                assertUnreadThread("Msg1");
            });
            // XXX: fails because we see a dot instead of an unread number - probably the server and client disagree
            it.skip("Reading an edit of a threaded message makes the room read", () => {
                // Given an edited thread message is making the room unread
                goTo(room1);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Resp1")]);
                assertUnread(room2, 2);
                goTo(room2);
                openThread("Msg1");
                assertRead(room2);
                backToThreadsList();
                goTo(room1);
                receiveMessages(room2, [editOf("Resp1", "Edit1")]);
                assertUnread(room2, 1);

                // When I read it
                goTo(room2);
                openThread("Msg1");

                // Then the room and thread are read
                assertRead(room2);
                assertReadThread("Msg1");
            });
            // XXX: fails because the room is still "bold" even though the notification counts all disappear
            it.skip("Marking a room as read after an edit in a thread makes it read", () => {
                // Given an edit in a thread is making the room unread
                goTo(room1);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Resp1"), editOf("Resp1", "Edit1")]);
                assertUnread(room2, 3); // TODO: the edit counts as a message!

                // When I mark the room as read
                markAsRead(room2);

                // Then it is read
                assertRead(room2);
            });
            // XXX: fails because the unread dot remains after marking as read
            it.skip("Editing a thread message after marking as read makes the room unread", () => {
                // Given a room is marked as read
                goTo(room1);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Resp1")]);
                assertUnread(room2, 2);
                markAsRead(room2);
                assertRead(room2);

                // When a message is edited
                receiveMessages(room2, [editOf("Resp1", "Edit1")]);

                // Then the room becomes unread
                assertUnread(room2, 1); // TODO: should this edit make us unread?
            });
            // XXX: fails because we see a dot instead of an unread number - probably the server and client disagree
            it.skip("A room with an edited threaded message is still unread after restart", () => {
                // Given an edit in a thread is making a room unread
                goTo(room1);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Resp1")]);
                markAsRead(room2);
                receiveMessages(room2, [editOf("Resp1", "Edit1")]);
                assertUnread(room2, 1);

                // When I restart
                saveAndReload();

                // Then is it still unread
                assertUnread(room2, 1);
            });
            it("A room where all threaded edits are read is still read after restart", () => {
                goTo(room2);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Resp1"), editOf("Resp1", "Edit1")]);
                assertUnread(room2, 2);
                openThread("Msg1");
                assertRead(room2);
                goTo(room1); // Make sure we are looking at room1 after reload
                assertRead(room2);

                saveAndReload();
                assertRead(room2);
            });
            // XXX: fails because we see a dot instead of an unread number - probably the server and client disagree
            it.skip("A room where all threaded edits are marked as read is still read after restart", () => {
                goTo(room1);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Resp1"), editOf("Resp1", "Edit1")]);
                assertUnread(room2, 3);
                markAsRead(room2);
                assertRead(room2);

                // When I restart
                saveAndReload();

                // It is still read
                assertRead(room2);
            });
        });

        describe("thread roots", () => {
            // XXX: fails because we see a dot instead of an unread number - probably the server and client disagree
            it.skip("An edit of a thread root makes the room unread", () => {
                // Given I have read a thread
                goTo(room1);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Resp1")]);
                assertUnread(room2, 2);
                goTo(room2);
                openThread("Msg1");
                backToThreadsList();
                assertRead(room2);
                goTo(room1);

                // When the thread root is edited
                receiveMessages(room2, [editOf("Msg1", "Edit1")]);

                // Then the room is unread
                assertUnread(room2, 1);

                // But the thread is read
                goTo(room2);
                assertRead(room2);
                assertReadThread("Edit1");
            });
            it("Reading an edit of a thread root makes the room read", () => {
                // Given a fully-read thread exists
                goTo(room2);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Resp1")]);
                openThread("Msg1");
                assertRead(room2);
                goTo(room1);
                assertRead(room2);

                // When the thread root is edited
                receiveMessages(room2, [editOf("Msg1", "Msg1 Edit1")]);

                // And I read that edit
                goTo(room2);

                // Then the room becomes read and stays read
                assertRead(room2);
                goTo(room1);
                assertRead(room2);
            });
            // XXX: fails because it shows a dot instead of unread count
            it.skip("Editing a thread root after reading makes the room unread", () => {
                // Given a fully-read thread exists
                goTo(room2);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Resp1")]);
                openThread("Msg1");
                assertRead(room2);
                goTo(room1);

                // When the thread root is edited
                receiveMessages(room2, [editOf("Msg1", "Msg1 Edit1")]);

                // Then the room becomes unread
                assertUnread(room2, 1);
            });
            // XXX: fails because the room has an unread dot after I marked it as read
            it.skip("Marking a room as read after an edit of a thread root makes it read", () => {
                // Given a fully-read thread exists
                goTo(room2);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Resp1")]);
                openThread("Msg1");
                assertRead(room2);
                goTo(room1);
                assertRead(room2);

                // When the thread root is edited
                receiveMessages(room2, [editOf("Msg1", "Msg1 Edit1")]);

                // And I mark the room as read
                markAsRead(room2);

                // Then the room becomes read and stays read
                assertRead(room2);
                goTo(room1);
                assertRead(room2);
            });
            // XXX: fails because the room has an unread dot after I marked it as read
            it.skip("Editing a thread root that is a reply after marking as read makes the room unread but not the thread", () => {
                // Given a thread based on a reply exists and is read because it is marked as read
                goTo(room1);
                receiveMessages(room2, ["Msg", replyTo("Msg", "Reply"), threadedOff("Reply", "InThread")]);
                assertUnread(room2, 3);
                markAsRead(room2);
                assertRead(room2);

                // When I edit the thread root
                receiveMessages(room1, [editOf("Reply", "Edited Reply")]);

                // Then the room is unread
                assertUnread(room2, 1);
                goTo(room2);

                // But the thread is still read (because the root is not part of the thread)
                assertReadThread("EditedReply");
            });
            // XXX: fails because the room has an unread dot after I marked it as read
            it.skip("Marking a room as read after an edit of a thread root that is a reply makes it read", () => {
                // Given a thread based on a reply exists and the reply has been edited
                goTo(room1);
                receiveMessages(room2, ["Msg", replyTo("Msg", "Reply"), threadedOff("Reply", "InThread")]);
                receiveMessages(room2, [editOf("Reply", "Edited Reply")]);
                assertUnread(room2, 3);

                // When I mark the room as read
                markAsRead(room2);

                // Then the room and thread are read
                assertRead(room2);
                goTo(room2);
                assertReadThread("Edited Reply");
            });
        });
    });

    describe("reactions", () => {
        describe("in the main timeline", () => {
            it("Receiving a reaction to a message does not make a room unread", () => {
                goTo(room1);
                assertRead(room2);
                receiveMessages(room2, ["Msg1", "Msg2"]);
                assertUnread(room2, 2);

                // When I read the main timeline
                goTo(room2);
                assertRead(room2);

                goTo(room1);
                receiveMessages(room2, [reactionTo("Msg2", "🪿")]);
                assertRead(room2);
            });
            it("Reacting to a message after marking as read does not make the room unread", () => {
                goTo(room1);
                assertRead(room2);
                receiveMessages(room2, ["Msg1", "Msg2"]);
                assertUnread(room2, 2);

                markAsRead(room2);
                assertRead(room2);

                receiveMessages(room2, [reactionTo("Msg2", "🪿")]);
                assertRead(room2);
            });
            it("A room with an unread reaction is still read after restart", () => {
                goTo(room1);
                assertRead(room2);
                receiveMessages(room2, ["Msg1", "Msg2"]);
                assertUnread(room2, 2);

                markAsRead(room2);
                assertRead(room2);

                receiveMessages(room2, [reactionTo("Msg2", "🪿")]);
                assertRead(room2);

                saveAndReload();
                assertRead(room2);
            });
            it("A room where all reactions are read is still read after restart", () => {
                goTo(room1);
                assertRead(room2);
                receiveMessages(room2, ["Msg1", "Msg2", reactionTo("Msg2", "🪿")]);
                assertUnread(room2, 2);

                markAsRead(room2);
                assertRead(room2);

                saveAndReload();
                assertRead(room2);
            });
        });

        describe("in threads", () => {
            it("A reaction to a threaded message does not make the room unread", () => {
                // Given a thread exists and I have read it
                goTo(room1);
                assertRead(room2);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Reply1")]);
                assertUnread(room2, 2);
                goTo(room2);
                openThread("Msg1");
                assertRead(room2);
                goTo(room1);

                // When someone reacts to a thread message
                receiveMessages(room2, [reactionTo("Reply1", "🪿")]);

                // Then the room remains read
                assertStillRead(room2);
            });
            // XXX: fails because the room is still "bold" even though the notification counts all disappear
            it.skip("Marking a room as read after a reaction in a thread makes it read", () => {
                // Given a thread exists with a reaction
                goTo(room1);
                assertRead(room2);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Reply1"), reactionTo("Reply1", "🪿")]);
                assertUnread(room2, 2);

                // When I mark the room as read
                markAsRead(room2);

                // Then it becomes read
                assertRead(room2);
            });
            // XXX: fails because the room is still "bold" even though the notification counts all disappear
            it.skip("Reacting to a thread message after marking as read does not make the room unread", () => {
                // Given a thread exists and I have marked it as read
                goTo(room1);
                assertRead(room2);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Reply1"), reactionTo("Reply1", "🪿")]);
                assertUnread(room2, 2);
                markAsRead(room2);
                assertRead(room2);

                // When someone reacts to a thread message
                receiveMessages(room2, [reactionTo("Reply1", "🪿")]);

                // Then the room remains read
                assertStillRead(room2);
            });
            it.skip("A room with a reaction to a threaded message is still unread after restart", () => {
                // Given a thread exists and I have read it
                goTo(room1);
                assertRead(room2);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Reply1")]);
                assertUnread(room2, 2);
                goTo(room2);
                openThread("Msg1");
                assertRead(room2);
                goTo(room1);

                // And someone reacted to it, which doesn't stop it being read
                receiveMessages(room2, [reactionTo("Reply1", "🪿")]);
                assertStillRead(room2);

                // When I restart
                saveAndReload();

                // Then the room is still read
                assertRead(room2);
            });
            it("A room where all reactions in threads are read is still read after restart", () => {
                // Given multiple threads with reactions exist and are read
                goTo(room1);
                assertRead(room2);
                receiveMessages(room2, [
                    "Msg1",
                    threadedOff("Msg1", "Reply1a"),
                    reactionTo("Reply1a", "r"),
                    "Msg2",
                    threadedOff("Msg1", "Reply1b"),
                    threadedOff("Msg2", "Reply2a"),
                    reactionTo("Msg1", "e"),
                    threadedOff("Msg2", "Reply2b"),
                    reactionTo("Reply2a", "a"),
                    reactionTo("Reply2b", "c"),
                    reactionTo("Reply1b", "t"),
                ]);
                assertUnread(room2, 6);
                goTo(room2);
                openThread("Msg1");
                assertReadThread("Msg1");
                openThread("Msg2");
                assertReadThread("Msg2");
                assertRead(room2);
                goTo(room1);

                // When I restart
                saveAndReload();

                // Then the room is still read
                assertRead(room2);
                goTo(room2);
                assertReadThread("Msg1");
                assertReadThread("Msg2");
            });
        });

        describe("thread roots", () => {
            it("A reaction to a thread root does not make the room unread", () => {
                // Given a read thread root exists
                goTo(room1);
                assertRead(room2);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Reply1")]);
                assertUnread(room2, 2);
                goTo(room2);
                openThread("Msg1");
                assertRead(room2);

                // When someone reacts to it
                goTo(room1);
                receiveMessages(room2, [reactionTo("Msg1", "🪿")]);
                cy.wait(200);

                // Then the room is still read
                assertRead(room2);
            });
            it("Reading a reaction to a thread root leaves the room read", () => {
                // Given a read thread root exists
                goTo(room1);
                assertRead(room2);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Reply1")]);
                assertUnread(room2, 2);
                goTo(room2);
                openThread("Msg1");
                assertRead(room2);

                // And the reaction to it does not make us unread
                goTo(room1);
                receiveMessages(room2, [reactionTo("Msg1", "🪿")]);
                assertRead(room2);

                // When we read the reaction and go away again
                goTo(room2);
                openThread("Msg1");
                assertRead(room2);
                goTo(room1);
                cy.wait(200);

                // Then the room is still read
                assertRead(room2);
            });
            // XXX: fails because the room is still "bold" even though the notification counts all disappear
            it.skip("Reacting to a thread root after marking as read makes the room unread but not the thread", () => {
                // Given a thread root exists
                goTo(room1);
                assertRead(room2);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Reply1")]);
                assertUnread(room2, 2);

                // And we have marked the room as read
                markAsRead(room2);
                assertRead(room2);

                // When someone reacts to it
                receiveMessages(room2, [reactionTo("Msg1", "🪿")]);
                cy.wait(200);

                // Then the room is still read
                assertRead(room2);
            });
        });
    });
});
