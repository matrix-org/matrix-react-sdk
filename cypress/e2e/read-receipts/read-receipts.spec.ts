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

/// <reference types="cypress" />

import type { MatrixClient, MatrixEvent } from "matrix-js-sdk/src/matrix";
import type { ISendEventResponse } from "matrix-js-sdk/src/@types/requests";
import type { ReceiptType } from "matrix-js-sdk/src/@types/read_receipts";
import type { Room } from "matrix-js-sdk/src/matrix";
import type { IndexedDBStore } from "matrix-js-sdk/src/matrix";
import { HomeserverInstance } from "../../plugins/utils/homeserver";
import Chainable = Cypress.Chainable;

describe("Read receipts", () => {
    const userName = "Mae";
    const botName = "Other User";
    const selectedRoomName = "Selected Room";
    const otherRoomName = "Other Room";

    let homeserver: HomeserverInstance;
    let otherRoomId: string;
    let selectedRoomId: string;
    let bot: MatrixClient | undefined;

    const botSendMessage = (no = 1): Cypress.Chainable<ISendEventResponse> => {
        return cy.botSendMessage(bot, otherRoomId, `Message ${no}`);
    };

    const botSendThreadMessage = (threadId: string): Cypress.Chainable<ISendEventResponse> => {
        return cy.botSendThreadMessage(bot, otherRoomId, threadId, "Message");
    };

    const fakeEventFromSent = (eventResponse: ISendEventResponse, threadRootId: string | undefined): MatrixEvent => {
        return {
            getRoomId: () => otherRoomId,
            getId: () => eventResponse.event_id,
            threadRootId,
            getTs: () => 1,
            isRelation: (relType) => {
                return !relType || relType === "m.thread";
            },
        } as any as MatrixEvent;
    };

    /**
     * Send a threaded receipt marking the message referred to in
     * eventResponse as read. If threadRootEventResponse is supplied, the
     * receipt will have its event_id as the thread root ID for the receipt.
     */
    const sendThreadedReadReceipt = (
        eventResponse: ISendEventResponse,
        threadRootEventResponse: ISendEventResponse = undefined,
    ) => {
        cy.sendReadReceipt(fakeEventFromSent(eventResponse, threadRootEventResponse?.event_id));
    };

    /**
     * Send an unthreaded receipt marking the message referred to in
     * eventResponse as read.
     */
    const sendUnthreadedReadReceipt = (eventResponse: ISendEventResponse) => {
        cy.sendReadReceipt(fakeEventFromSent(eventResponse, undefined), "m.read" as any as ReceiptType, true);
    };

    beforeEach(() => {
        /*
         * Create 2 rooms:
         *
         * - Selected room - this one is clicked in the UI
         * - Other room - this one contains the bot, which will send events so
         *                we can check its unread state.
         */
        cy.startHomeserver("default").then((data) => {
            homeserver = data;
            cy.initTestUser(homeserver, userName)
                .then(() => {
                    cy.createRoom({ name: selectedRoomName }).then((createdRoomId) => {
                        selectedRoomId = createdRoomId;
                    });
                })
                .then(() => {
                    cy.createRoom({ name: otherRoomName }).then((createdRoomId) => {
                        otherRoomId = createdRoomId;
                    });
                })
                .then(() => {
                    cy.getBot(homeserver, { displayName: botName }).then((botClient) => {
                        bot = botClient;
                    });
                })
                .then(() => {
                    // Invite the bot to Other room
                    cy.inviteUser(otherRoomId, bot.getUserId());
                    cy.visit("/#/room/" + otherRoomId);
                    cy.findByText(botName + " joined the room").should("exist");

                    // Then go into Selected room
                    cy.visit("/#/room/" + selectedRoomId);
                });
        });
    });

    afterEach(() => {
        cy.stopHomeserver(homeserver);
    });

    it(
        "With sync accumulator, considers main thread and unthreaded receipts #24629",
        {
            // When #24629 exists, the test fails the first time but passes later, so we disable retries
            // to be sure we are going to fail if the bug comes back.
            // Why does it pass the second time? I wish I knew. (andyb)
            retries: 0,
        },
        () => {
            // Details are in https://github.com/vector-im/element-web/issues/24629
            // This proves we've fixed one of the "stuck unreads" issues.

            // Given we sent 3 events on the main thread
            botSendMessage();
            botSendMessage().then((main2) => {
                botSendMessage().then((main3) => {
                    // (So the room starts off unread)
                    cy.findByLabelText(`${otherRoomName} 3 unread messages.`).should("exist");

                    // When we send a threaded receipt for the last event in main
                    // And an unthreaded receipt for an earlier event
                    sendThreadedReadReceipt(main3);
                    sendUnthreadedReadReceipt(main2);

                    // (So the room has no unreads)
                    cy.findByLabelText(`${otherRoomName}`).should("exist");

                    // And we persuade the app to persist its state to indexeddb by reloading and waiting
                    cy.reload();
                    cy.findByLabelText(`${selectedRoomName}`).should("exist");

                    // And we reload again, fetching the persisted state FROM indexeddb
                    cy.reload();

                    // Then the room is read, because the persisted state correctly remembers both
                    // receipts. (In #24629, the unthreaded receipt overwrote the main thread one,
                    // meaning that the room still said it had unread messages.)
                    cy.findByLabelText(`${otherRoomName}`).should("exist");
                    cy.findByLabelText(`${otherRoomName} Unread messages.`).should("not.exist");
                });
            });
        },
    );

    it("Recognises unread messages on main thread after receiving a receipt for earlier ones", () => {
        // Given we sent 3 events on the main thread
        botSendMessage();
        botSendMessage().then((main2) => {
            botSendMessage().then(() => {
                // (The room starts off unread)
                cy.findByLabelText(`${otherRoomName} 3 unread messages.`).should("exist");

                // When we send a threaded receipt for the second-last event in main
                sendThreadedReadReceipt(main2);

                // Then the room has only one unread
                cy.findByLabelText(`${otherRoomName} 1 unread message.`).should("exist");
            });
        });
    });

    it("Considers room read if there is only a main thread and we have a main receipt", () => {
        // Given we sent 3 events on the main thread
        botSendMessage();
        botSendMessage().then(() => {
            botSendMessage().then((main3) => {
                // (The room starts off unread)
                cy.findByLabelText(`${otherRoomName} 3 unread messages.`).should("exist");

                // When we send a threaded receipt for the last event in main
                sendThreadedReadReceipt(main3);

                // Then the room has no unreads
                cy.findByLabelText(`${otherRoomName}`).should("exist");
            });
        });
    });

    it("Recognises unread messages on other thread after receiving a receipt for earlier ones", () => {
        // Given we sent 3 events on the main thread
        botSendMessage().then((main1) => {
            botSendThreadMessage(main1.event_id).then((thread1a) => {
                botSendThreadMessage(main1.event_id).then((thread1b) => {
                    // 1 unread on the main thread, 2 in the new thread
                    cy.findByLabelText(`${otherRoomName} 3 unread messages.`).should("exist");

                    // When we send receipts for main, and the second-last in the thread
                    sendThreadedReadReceipt(main1);
                    sendThreadedReadReceipt(thread1a, main1);

                    // Then the room has only one unread - the one in the thread
                    cy.findByLabelText(`${otherRoomName} 1 unread message.`).should("exist");
                });
            });
        });
    });

    it("Considers room read if there are receipts for main and other thread", () => {
        // Given we sent 3 events on the main thread
        botSendMessage().then((main1) => {
            botSendThreadMessage(main1.event_id).then((thread1a) => {
                botSendThreadMessage(main1.event_id).then((thread1b) => {
                    // 1 unread on the main thread, 2 in the new thread
                    cy.findByLabelText(`${otherRoomName} 3 unread messages.`).should("exist");

                    // When we send receipts for main, and the last in the thread
                    sendThreadedReadReceipt(main1);
                    sendThreadedReadReceipt(thread1b, main1);

                    // Then the room has no unreads
                    cy.findByLabelText(`${otherRoomName}`).should("exist");
                });
            });
        });
    });

    it("Recognises unread messages on a thread after receiving a unthreaded receipt for earlier ones", () => {
        // Given we sent 3 events on the main thread
        botSendMessage().then((main1) => {
            botSendThreadMessage(main1.event_id).then((thread1a) => {
                botSendThreadMessage(main1.event_id).then(() => {
                    // 1 unread on the main thread, 2 in the new thread
                    cy.findByLabelText(`${otherRoomName} 3 unread messages.`).should("exist");

                    // When we send an unthreaded receipt for the second-last in the thread
                    sendUnthreadedReadReceipt(thread1a);

                    // Then the room has only one unread - the one in the
                    // thread. The one in main is read because the unthreaded
                    // receipt is for a later event.
                    cy.findByLabelText(`${otherRoomName} 1 unread message.`).should("exist");
                });
            });
        });
    });

    it("Recognises unread messages on main after receiving a unthreaded receipt for a thread message", () => {
        // Given we sent 3 events on the main thread
        botSendMessage().then((main1) => {
            botSendThreadMessage(main1.event_id).then(() => {
                botSendThreadMessage(main1.event_id).then((thread1b) => {
                    botSendMessage().then(() => {
                        // 2 unreads on the main thread, 2 in the new thread
                        cy.findByLabelText(`${otherRoomName} 4 unread messages.`).should("exist");

                        // When we send an unthreaded receipt for the last in the thread
                        sendUnthreadedReadReceipt(thread1b);

                        // Then the room has only one unread - the one in the
                        // main thread, because it is later than the unthreaded
                        // receipt.
                        cy.findByLabelText(`${otherRoomName} 1 unread message.`).should("exist");
                    });
                });
            });
        });
    });

    /**
     * The idea of this test is to intercept the receipt / read read_markers requests and
     * assert that the correct ones are sent.
     * Prose playbook:
     * - Another user sends enough messages that the timeline becomes scrollable
     * - The current user looks at the room and jumps directly to the first unread message
     * - At this point, a receipt for the last message in the room and
     *   a fully read marker for the last visible message are expected to be sent
     * - Then the user jumps to the end of the timeline
     * - A fully read marker for the last message in the room is expected to be sent
     */
    it("Should send the correct receipts", () => {
        const uriEncodedOtherRoomId = encodeURIComponent(otherRoomId);

        cy.intercept({
            method: "POST",
            url: new RegExp(
                `http://localhost:\\d+/_matrix/client/r0/rooms/${uriEncodedOtherRoomId}/receipt/m\\.read/.+`,
            ),
        }).as("receiptRequest");

        const numberOfMessages = 20;
        const sendMessagePromises = [];

        for (let i = 1; i <= numberOfMessages; i++) {
            sendMessagePromises.push(botSendMessage(i));
        }

        cy.all(sendMessagePromises).then((sendMessageResponses) => {
            const lastMessageId = sendMessageResponses.at(-1).event_id;
            const uriEncodedLastMessageId = encodeURIComponent(lastMessageId);

            // wait until all messages have been received
            cy.findByLabelText(`${otherRoomName} ${sendMessagePromises.length} unread messages.`).should("exist");

            // switch to the room with the messages
            cy.visit("/#/room/" + otherRoomId);

            cy.wait("@receiptRequest").should((req) => {
                // assert the read receipt for the last message in the room
                expect(req.request.url).to.contain(uriEncodedLastMessageId);
                expect(req.request.body).to.deep.equal({
                    thread_id: "main",
                });
            });

            // the following code tests the fully read marker somewhere in the middle of the room

            cy.intercept({
                method: "POST",
                url: new RegExp(`http://localhost:\\d+/_matrix/client/r0/rooms/${uriEncodedOtherRoomId}/read_markers`),
            }).as("readMarkersRequest");

            cy.findByRole("button", { name: "Jump to first unread message." }).click();

            cy.wait("@readMarkersRequest").should((req) => {
                // since this is not pixel perfect,
                // the fully read marker should be +/- 1 around the last visible message
                expect(Array.from(Object.keys(req.request.body))).to.deep.equal(["m.fully_read"]);
                expect(req.request.body["m.fully_read"]).to.be.oneOf([
                    sendMessageResponses[11].event_id,
                    sendMessageResponses[12].event_id,
                    sendMessageResponses[13].event_id,
                ]);
            });

            // the following code tests the fully read marker at the bottom of the room

            cy.intercept({
                method: "POST",
                url: new RegExp(`http://localhost:\\d+/_matrix/client/r0/rooms/${uriEncodedOtherRoomId}/read_markers`),
            }).as("readMarkersRequest");

            cy.findByRole("button", { name: "Scroll to most recent messages" }).click();

            cy.wait("@readMarkersRequest").should((req) => {
                expect(req.request.body).to.deep.equal({
                    ["m.fully_read"]: sendMessageResponses.at(-1).event_id,
                });
            });
        });
    });

    abstract class MessageSpec {
        public abstract getContent(room: Room): Promise<Record<string, unknown>>;
    }

    type Message = string | MessageSpec;

    function goTo(room: string) {
        cy.viewRoomByName(room);
    }

    function findRoomByName(room: string): Chainable<Room> {
        return cy.getClient().then((cli) => {
            return cli.getRooms().find((r) => r.name === room);
        });
    }

    function openThread(rootMessage: string) {
        cy.get(".mx_RoomView_body").within(() => {
            cy.contains(".mx_EventTile[data-scroll-tokens]", rootMessage)
                .realHover()
                .findByRole("button", { name: "Reply in thread" })
                .click();
        });
        cy.get(".mx_ThreadView_timelinePanelWrapper").should("have.length", 1);
    }

    // Sends messages into given room as a bot
    function receiveMessages(room: string, messages: Message[]) {
        findRoomByName(room).then(async ({ roomId }) => {
            const room = bot.getRoom(roomId);
            for (const message of messages) {
                if (typeof message === "string") {
                    await bot.sendTextMessage(roomId, message);
                } else {
                    await bot.sendMessage(roomId, await message.getContent(room));
                }
            }
        });
    }

    async function getMessage(room: Room, message: string): Promise<MatrixEvent> {
        const ev = room.timeline.find((e) => e.getContent().body === message);
        if (ev) return ev;

        return new Promise((resolve) => {
            room.on("Room.timeline" as any, (ev: MatrixEvent) => {
                if (ev.getContent().body === message) {
                    resolve(ev);
                }
            });
        });
    }

    function editOf(originalMessage: string, newMessage: string): MessageSpec {
        return new (class extends MessageSpec {
            public async getContent(room: Room): Promise<Record<string, unknown>> {
                const ev = await getMessage(room, originalMessage);

                const content = ev.getContent();
                return {
                    "msgtype": content.msgtype,
                    "body": `* ${newMessage}`,
                    "m.new_content": {
                        msgtype: content.msgtype,
                        body: newMessage,
                    },
                };
            }
        })();
    }

    function replyTo(targetMessage: string, newMessage: string): MessageSpec {
        return new (class extends MessageSpec {
            public async getContent(room: Room): Promise<Record<string, unknown>> {
                const ev = await getMessage(room, targetMessage);

                return {
                    "msgtype": "m.text",
                    "body": newMessage,
                    "m.relates_to": {
                        "m.in_reply_to": {
                            event_id: ev.getId(),
                        },
                    },
                };
            }
        })();
    }

    function threadedOff(rootMessage: string, newMessage: string): MessageSpec {
        return new (class extends MessageSpec {
            public async getContent(room: Room): Promise<Record<string, unknown>> {
                const ev = await getMessage(room, rootMessage);

                return {
                    "msgtype": "m.text",
                    "body": newMessage,
                    "m.relates_to": {
                        event_id: ev.getId(),
                        is_falling_back: true,
                        rel_type: "m.thread",
                    },
                };
            }
        })();
    }

    function getRoomListTile(room: string) {
        return cy.findByRole("treeitem", { name: new RegExp("^" + room) });
    }

    function markAsRead(room: string) {
        getRoomListTile(room).rightclick();
        cy.findByText("Mark as read").click();
    }

    function assertRead(room: string) {
        return getRoomListTile(room).within(() => {
            cy.get(".mx_NotificationBadge_dot").should("not.exist");
            cy.get(".mx_NotificationBadge_count").should("not.exist");
        });
    }

    function assertUnread(room: string, count: number | ".") {
        return getRoomListTile(room).within(() => {
            if (count === ".") {
                cy.get(".mx_NotificationBadge_dot").should("exist");
            } else {
                cy.get(".mx_NotificationBadge_count").should("have.text", count);
            }
        });
    }

    function openThreadList() {
        cy.findByTestId("threadsButton").then((button) => {
            if (button?.attr("aria-current") !== "true") {
                button.trigger("click");
            }
        });
        cy.get(".mx_ThreadPanel").should("exist");
        // If the Threads back button is present then click it, the threads button can open either threads list or thread panel
        Cypress.$('.mx_BaseCard_back[title="Threads"]')?.trigger("click");
    }

    function getThreadListTile(rootMessage: string) {
        openThreadList();
        return cy.contains(".mx_ThreadPanel .mx_EventTile_body", rootMessage).closest("li");
    }

    function assertReadThread(rootMessage: string) {
        return getThreadListTile(rootMessage).within(() => {
            cy.get(".mx_NotificationBadge").should("not.exist");
        });
    }

    function assertUnreadThread(rootMessage: string) {
        return getThreadListTile(rootMessage).within(() => {
            cy.get(".mx_NotificationBadge").should("exist");
        });
    }

    function saveAndReload() {
        cy.getClient().then((cli) => {
            // @ts-ignore
            return (cli.store as IndexedDBStore).reallySave();
        });
        cy.reload();
        // Wait for the app to reload
        cy.get(".mx_RoomView").should("exist");
    }

    const room1 = selectedRoomName;
    const room2 = otherRoomName;

    describe("new messages", () => {
        describe("in the main timeline", () => {
            it("Sending a message makes a room unread", () => {
                goTo(room1);
                assertRead(room2);

                receiveMessages(room2, ["Msg1"]);
                assertUnread(room2, 1);
            });
            it("Reading latest message makes the room read", () => {
                goTo(room1);
                assertRead(room2);
                receiveMessages(room2, ["Msg1"]);
                assertUnread(room2, 1);

                // When I read the main timeline
                goTo(room2);
                assertRead(room2);
            });
            it.skip("Reading an older message leaves the room unread", () => {});
            it("Marking a room as read makes it read", () => {
                goTo(room1);
                assertRead(room2);
                receiveMessages(room2, ["Msg1"]);
                assertUnread(room2, 1);

                markAsRead(room2);
                assertRead(room2);
            });
            it("Sending a new message after marking as read makes it unread", () => {
                goTo(room1);
                assertRead(room2);
                receiveMessages(room2, ["Msg1"]);
                assertUnread(room2, 1);

                markAsRead(room2);
                assertRead(room2);

                receiveMessages(room2, ["Msg2"]);
                assertUnread(room2, 1);
            });
            it("A room with a new message is still unread after restart", () => {
                goTo(room1);
                assertRead(room2);
                receiveMessages(room2, ["Msg1"]);
                assertUnread(room2, 1);

                saveAndReload();
                assertUnread(room2, 1);
            });
            it("A room where all messages are read is still read after restart", () => {
                goTo(room1);
                assertRead(room2);
                receiveMessages(room2, ["Msg1"]);
                assertUnread(room2, 1);

                markAsRead(room2);
                assertRead(room2);

                saveAndReload();
                assertRead(room2);
            });
        });

        describe("in threads", () => {
            it("Sending a message makes a room unread", () => {
                // Given a thread exists
                goTo(room1);
                receiveMessages(room2, ["Msg1"]);
                assertUnread(room2, 1);
                goTo(room2);

                assertRead(room2);
                goTo(room1);

                receiveMessages(room2, [threadedOff("Msg1", "Resp1")]);
                assertUnread(room2, 1);
            });
            it("Reading the last threaded message makes the room read", () => {
                // Given a thread exists
                goTo(room1);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Resp1")]);
                assertUnread(room2, 1);
                goTo(room2);

                openThread("Msg1");
                assertRead(room2);
            });
            it("Reading a thread message makes the thread read", () => {
                // Given a thread exists
                goTo(room1);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Resp1"), threadedOff("Msg1", "Resp2")]);
                assertUnread(room2, 2); // (Sanity)

                // When I read the main timeline
                goTo(room2);

                // Then room does appear unread
                assertUnread(room2, 2);

                // Until we open the thread
                openThread("Msg1");
                assertReadThread("Msg1");
                assertRead(room2);
            });
            it.skip("Reading an older thread message (via permalink) leaves the thread unread", () => {});
            it("Reading only one thread's message does not make the room read", () => {
                goTo(room1);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Resp1"), "Msg2", threadedOff("Msg2", "Resp2")]);
                assertUnread(room2, 4);
                goTo(room2);
                assertUnread(room2, 4);

                openThread("Msg1");
                assertUnread(room2, 1);
            });
            it("Reading only one thread's message make that thread read but not others", () => {
                goTo(room1);
                receiveMessages(room2, ["Msg1", "Msg2", threadedOff("Msg1", "Resp1"), threadedOff("Msg2", "Resp2")]);
                assertUnread(room2, 4); // (Sanity)

                // When I read the main timeline
                goTo(room2);

                assertUnread(room2, 2);
                assertUnreadThread("Msg1");
                assertUnreadThread("Msg2");

                openThread("Msg1");
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
            // XXX: this failure seems legit
            it.skip("Marking a room with unread threads as read makes it read", () => {
                goTo(room1);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Resp1"), threadedOff("Msg1", "Resp2")]);
                assertUnread(room2, 3); // (Sanity)

                markAsRead(room2);
                assertRead(room2);
            });
            it("Sending a new thread message after marking as read makes it unread", () => {
                // Given a thread exists
                goTo(room1);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Resp1"), threadedOff("Msg1", "Resp2")]);

                // When I read the main timeline
                goTo(room2);

                // And the thread
                openThread("Msg1");

                goTo(room1);
                // Receive additional response to thread whilst not looking at room
                receiveMessages(room2, [threadedOff("Msg1", "Resp3")]);

                assertUnread(room2, 1);
            });
            it("A room with a new threaded message is still unread after restart", () => {
                // Given a thread exists
                goTo(room1);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Resp1"), threadedOff("Msg1", "Resp2")]);
                assertUnread(room2, 2); // (Sanity)

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
                assertRead(room2);

                saveAndReload();
                assertRead(room2);
            });
        });

        describe("thread roots", () => {
            it("Reading a thread root does not mark the thread as read", () => {
                // Given a thread exists
                goTo(room1);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Resp1")]);
                assertUnread(room2, 1); // (Sanity)

                // When I read the main timeline
                goTo(room2);

                // Then room does appear unread
                assertUnread(room2, 2);
                assertUnreadThread("Msg1");
            });
            it.skip("Reading a thread root within the thread view marks it as read in the main timeline", () => {});
            it("Creating a new thread based on a reply makes the room unread", () => {
                goTo(room1);
                receiveMessages(room2, ["Msg1", replyTo("Msg1", "Reply1"), threadedOff("Reply1", "Resp1")]);
                assertUnread(room2, 3);
            });
            it("Reading a thread whose root is a reply makes the room read", () => {
                goTo(room1);
                receiveMessages(room2, ["Msg1", replyTo("Msg1", "Reply1"), threadedOff("Reply1", "Resp1")]);
                assertUnread(room2, 3);

                goTo(room2);
                assertUnread(room2, 1);
                assertUnreadThread("Reply1");

                openThread("Reply1");
                assertRead(room2);
            });
        });
    });

    describe("editing messages", () => {
        describe("in the main timeline", () => {
            it("Editing a message makes a room unread", () => {
                // Given I am not in the room
                goTo(room1);

                receiveMessages(room2, ["Msg1"]);
                assertUnread(room2, 1);
                markAsRead(room2);

                // When an edit appears in the room
                receiveMessages(room2, [editOf("Msg1", "Msg1 Edit1")]);

                // Then it becomes unread
                assertUnread(room2, 1);
            });
            it("Reading an edit makes the room read", () => {
                goTo(room1);
                receiveMessages(room2, ["Msg1"]);
                assertUnread(room2, 1);
                markAsRead(room2);
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
                goTo(room1);
                receiveMessages(room2, ["Msg1"]);
                assertUnread(room2, 1);
                markAsRead(room2);
                receiveMessages(room2, [editOf("Msg1", "Msg1 Edit1")]);
                assertUnread(room2, 1);

                // When I mark it as read
                markAsRead(room2);

                // Then the room becomes read
                assertRead(room2);
            });
            it("Editing a message after marking as read makes the room unread", () => {
                goTo(room1);
                receiveMessages(room2, ["Msg1"]);
                assertUnread(room2, 1);

                // When I mark it as read
                markAsRead(room2);

                receiveMessages(room2, [editOf("Msg1", "Msg1 Edit1")]);

                // Then the room becomes unread
                assertUnread(room2, 1);
            });
            it.skip("Editing a reply after reading it makes the room unread", () => {});
            it.skip("Editing a reply after marking as read makes the room unread", () => {});
            it.skip("A room with an edit is still unread after restart", () => {});
            it.skip("A room where all edits are read is still read after restart", () => {});
        });

        describe("in threads", () => {
            it.skip("An edit of a threaded message makes the room unread", () => {});
            it.skip("Reading an edit of a threaded message makes the room read", () => {});
            it.skip("Marking a room as read after an edit in a thread makes it read", () => {});
            it.skip("Editing a thread message after marking as read makes the room unread", () => {});
            it.skip("A room with an edited threaded message is still unread after restart", () => {});
            it.skip("A room where all threaded edits are read is still read after restart", () => {});
        });

        describe("thread roots", () => {
            it.skip("An edit of a thread root makes the room unread", () => {});
            it.skip("Reading an edit of a thread root makes the room read", () => {
                // Given a fully-read thread exists
                goTo(room2);
                receiveMessages(room2, ["Msg1", threadedOff("Msg1", "Resp1")]);
                openThread("Msg1");
                goTo(room1);
                assertRead(room2);

                // When the thread root is edited
                receiveMessages(room2, [editOf("Msg1", "Msg1 Edit1")]);

                // And I read that edit
                goTo(room2);

                // Then the room becomes unread and stays unread
                assertRead(room2);
                goTo(room1);
                assertRead(room2);
            });
            it.skip("Marking a room as read after an edit of a thread root makes it read", () => {});
            it.skip("Editing a thread root after marking as read makes the room unread", () => {});
            it.skip("Marking a room as read after an edit of a thread root that is a reply makes it read", () => {});
            it.skip("Editing a thread root that is a reply after marking as read makes the room unread but not the thread", () => {});
        });
    });

    describe("reactions", () => {
        // Justification for this section: edits an reactions are similar, so we
        // might choose to miss this section, but I have included it because
        // edits replace the content of the original event in our code and
        // reactions don't, so it seems possible that bugs could creep in that
        // affect only one or the other.

        describe("in the main timeline", () => {
            it.skip("Reacting to a message makes a room unread", () => {});
            it.skip("Reading a reaction makes the room read", () => {});
            it.skip("Marking a room as read after a reaction makes it read", () => {});
            it.skip("Reacting to a message after marking as read makes the room unread", () => {});
            it.skip("A room with a reaction is still unread after restart", () => {});
            it.skip("A room where all reactions are read is still read after restart", () => {});
        });

        describe("in threads", () => {
            it.skip("A reaction to a threaded message makes the room unread", () => {});
            it.skip("Reading a reaction to a threaded message makes the room read", () => {});
            it.skip("Marking a room as read after a reaction in a thread makes it read", () => {});
            it.skip("Reacting to a thread message after marking as read makes the room unread", () => {});
            it.skip("A room with a reaction to a threaded message is still unread after restart", () => {});
            it.skip("A room where all reactions in threads are read is still read after restart", () => {});
        });

        describe("thread roots", () => {
            it.skip("A reaction to a thread root makes the room unread", () => {});
            it.skip("Reading a reaction to a thread root makes the room read", () => {});
            it.skip("Marking a room as read after a reaction to a thread root makes it read", () => {});
            it.skip("Reacting to a thread root after marking as read makes the room unread but not the thread", () => {});
        });
    });

    describe("redactions", () => {
        describe("in the main timeline", () => {
            // One of the following two must be right:
            it.skip("Redacting the message pointed to by my receipt leaves the room read", () => {});
            it.skip("Redacting a message after it was read makes the room unread", () => {});

            it.skip("Reading an unread room after a redaction of the latest message makes it read", () => {});
            it.skip("Reading an unread room after a redaction of an older message makes it read", () => {});
            it.skip("Marking an unread room as read after a redaction makes it read", () => {});
            it.skip("Sending and redacting a message after marking the room as read makes it unread", () => {});
            it.skip("?? Redacting a message after marking the room as read makes it unread", () => {});
            it.skip("Reacting to a redacted message leaves the room read", () => {});
            it.skip("Editing a redacted message leaves the room read", () => {});

            it.skip("?? Reading a reaction to a redacted message marks the room as read", () => {});
            it.skip("?? Reading an edit of a redacted message marks the room as read", () => {});
            it.skip("Reading a reply to a redacted message marks the room as read", () => {});

            it.skip("A room with an unread redaction is still unread after restart", () => {});
            it.skip("A room with a read redaction is still read after restart", () => {});
        });

        describe("in threads", () => {
            // One of the following two must be right:
            it.skip("Redacting the threaded message pointed to by my receipt leaves the room read", () => {});
            it.skip("Redacting a threaded message after it was read makes the room unread", () => {});

            it.skip("Reading an unread thread after a redaction of the latest message makes it read", () => {});
            it.skip("Reading an unread thread after a redaction of an older message makes it read", () => {});
            it.skip("Marking an unread thread as read after a redaction makes it read", () => {});
            it.skip("Sending and redacting a message after marking the thread as read makes it unread", () => {});
            it.skip("?? Redacting a message after marking the thread as read makes it unread", () => {});
            it.skip("Reacting to a redacted message leaves the thread read", () => {});
            it.skip("Editing a redacted message leaves the thread read", () => {});

            it.skip("?? Reading a reaction to a redacted message marks the thread as read", () => {});
            it.skip("?? Reading an edit of a redacted message marks the thread as read", () => {});
            it.skip("Reading a reply to a redacted message marks the thread as read", () => {});

            it.skip("A thread with an unread redaction is still unread after restart", () => {});
            it.skip("A thread with a read redaction is still read after restart", () => {});
            it.skip("A thread with an unread reply to a redacted message is still unread after restart", () => {});
            it.skip("A thread with a read replt to a redacted message is still read after restart", () => {});
        });

        describe("thread roots", () => {
            // One of the following two must be right:
            it.skip("Redacting a thread root after it was read leaves the room read", () => {});
            it.skip("Redacting a thread root after it was read makes the room unread", () => {});

            it.skip("Redacting the root of an unread thread makes the room read", () => {});
            it.skip("Sending a threaded message onto a redacted thread root leaves the room read", () => {});
            it.skip("Reacting to a redacted thread root leaves the room read", () => {});
            it.skip("Editing a redacted thread root leaves the room read", () => {});
            it.skip("Replying to a redacted thread root makes the room unread", () => {});
            it.skip("Reading a reply to a redacted thread root makes the room read", () => {});
        });
    });

    describe("messages with missing referents", () => {
        it.skip("A message in an unknown thread is not visible and the room is read", () => {});
        it.skip("When a message's thread root appears later the thread appears and the room is unread", () => {});
        it.skip("An edit of an unknown message is not visible and the room is read", () => {});
        it.skip("When an edit's message appears later the edited version appears and the room is unread", () => {});
        it.skip("A reaction to an unknown message is not visible and the room is read", () => {});
        it.skip("When an reactions's message appears later it appears and the room is unread", () => {});
        // Harder: validate that we request the messages we are missing?
    });

    describe("receipts with missing events", () => {
        // Later: when we have order in receipts, we can change these tests to
        // make receipts still work, even when their message is not found.
        it.skip("A receipt for an unknown message does not change the state of an unread room", () => {});
        it.skip("A receipt for an unknown message does not change the state of a read room", () => {});
        it.skip("A threaded receipt for an unknown message does not change the state of an unread thread", () => {});
        it.skip("A threaded receipt for an unknown message does not change the state of a read thread", () => {});
        it.skip("A threaded receipt for an unknown thread does not change the state of an unread thread", () => {});
        it.skip("A threaded receipt for an unknown thread does not change the state of a read thread", () => {});
        it.skip("A threaded receipt for a message on main does not change the state of an unread room", () => {});
        it.skip("A threaded receipt for a message on main does not change the state of a read room", () => {});
        it.skip("A main receipt for a message on a thread does not change the state of an unread room", () => {});
        it.skip("A main receipt for a message on a thread does not change the state of a read room", () => {});
        it.skip("A threaded receipt for a thread root does not mark it as read", () => {});
        // Harder: validate that we request the messages we are missing?
    });

    describe("Message ordering", () => {
        describe("in the main timeline", () => {
            it.skip("A receipt for the last event in sync order (even with wrong ts) marks a room as read", () => {});
            it.skip("A receipt for a non-last event in sync order (even when ts makes it last) leaves room unread", () => {});
        });

        describe("in threads", () => {
            // These don't pass yet - we need MSC4033 - we don't even know the Sync order yet
            it.skip("A receipt for the last event in sync order (even with wrong ts) marks a thread as read", () => {});
            it.skip("A receipt for a non-last event in sync order (even when ts makes it last) leaves thread unread", () => {});

            // These pass now and should not later - we should use order from MSC4033 instead of ts
            // These are broken out
            it.skip("A receipt for last threaded event in ts order (even when it was received non-last) marks a thread as read", () => {});
            it.skip("A receipt for non-last threaded event in ts order (even when it was received last) leaves thread unread", () => {});
            it.skip("A receipt for last threaded edit in ts order (even when it was received non-last) marks a thread as read", () => {});
            it.skip("A receipt for non-last threaded edit in ts order (even when it was received last) leaves thread unread", () => {});
            it.skip("A receipt for last threaded reaction in ts order (even when it was received non-last) marks a thread as read", () => {});
            it.skip("A receipt for non-last threaded reaction in ts order (even when it was received last) leaves thread unread", () => {});
        });

        describe("thread roots", () => {
            it.skip("A receipt for last reaction to thread root in sync order (even when ts makes it last) marks room as read", () => {});
            it.skip("A receipt for non-last reaction to thread root in sync order (even when ts makes it last) leaves room unread", () => {});
            it.skip("A receipt for last edit to thread root in sync order (even when ts makes it last) marks room as read", () => {});
            it.skip("A receipt for non-last edit to thread root in sync order (even when ts makes it last) leaves room unread", () => {});
        });
    });

    describe("Ignored events", () => {
        it.skip("If all events after receipt are unimportant, the room is read", () => {});
        it.skip("Sending an important event after unimportant ones makes the room unread", () => {});
        it.skip("A receipt for the last unimportant event makes the room read, even if all are unimportant", () => {});
    });

    describe("Paging up", () => {
        it.skip("Paging up through old messages after a room is read leaves the room read", () => {});
        it.skip("Paging up through old messages of an unread room leaves the room unread", () => {});
        it.skip("Paging up to find old threads that were previously read leaves the room read", () => {});
        it.skip("?? Paging up to find old threads that were never read marks the room unread", () => {});
        it.skip("After marking room as read, paging up to find old threads that were never read leaves the room read", () => {});
    });

    describe("Room list order", () => {
        it.skip("Rooms with unread threads appear at the top of room list if 'unread first' is selected", () => {});
    });

    describe("Notifications", () => {
        describe("in the main timeline", () => {
            it.skip("A new message that mentions me shows a notification", () => {});
            it.skip("Reading a notifying message reduces the notification count in the room list, space and tab", () => {});
            it.skip("Reading the last notifying message removes the notification marker from room list, space and tab", () => {});
            it.skip("Editing a message to mentions me shows a notification", () => {});
            it.skip("Reading the last notifying edited message removes the notification marker", () => {});
            it.skip("Redacting a notifying message removes the notification marker", () => {});
        });

        describe("in threads", () => {
            it.skip("A new threaded message that mentions me shows a notification", () => {});
            it.skip("Reading a notifying threaded message removes the notification count", () => {});
            it.skip("Notification count remains steady when reading threads that contain seen notifications", () => {});
            it.skip("Notification count remains steady when paging up thread view even when threads contain seen notifications", () => {});
            it.skip("Notification count remains steady when paging up thread view after mark as unread even if older threads contain notifications", () => {});
            it.skip("Redacting a notifying threaded message removes the notification marker", () => {});
        });
    });
});
