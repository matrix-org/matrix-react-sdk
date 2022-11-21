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

/// <reference types="cypress" />

import { PollResponseEvent } from "matrix-events-sdk";

import { SynapseInstance } from "../../plugins/synapsedocker";
import { MatrixClient } from "../../global";
import Chainable = Cypress.Chainable;

const hideTimestampCSS = ".mx_MessageTimestamp { visibility: hidden !important; }";

describe("Polls", () => {
    let synapse: SynapseInstance;

    type CreatePollOptions = {
        title: string;
        options: string[];
        multiSelect?: boolean;
        maxSelections?: string;
    };
    const createPoll = ({ title, options, multiSelect = false, maxSelections }: CreatePollOptions) => {
        if (options.length < 2) {
            throw new Error('Poll must have at least two options');
        }
        cy.get('.mx_PollCreateDialog').within((pollCreateDialog) => {
            cy.get('#poll-topic-input').type(title);

            options.forEach((option, index) => {
                const optionId = `#pollcreate_option_${index}`;

                // click 'add option' button if needed
                if (pollCreateDialog.find(optionId).length === 0) {
                    cy.get('.mx_PollCreateDialog_addOption').scrollIntoView().click();
                }
                cy.get(optionId).scrollIntoView().type(option);
            });

            if (multiSelect) {
                if (!maxSelections) {
                    cy.get('#mx_Field_2')
                        .find('option')
                        .its('length')
                        .then((length) => {
                            // select last option
                            cy.get('#mx_Field_2').select(length - 1);
                        });
                } else {
                    cy.get('#mx_Field_2').select(maxSelections);
                }
            }
        });
        cy.get('.mx_Dialog button[type="submit"]').click();
    };

    const getPollTile = (pollId: string): Chainable<JQuery> => {
        return cy.get(`.mx_EventTile[data-scroll-tokens="${pollId}"]`);
    };

    const getPollOption = (pollId: string, optionText: string): Chainable<JQuery> => {
        return getPollTile(pollId).contains('.mx_MPollBody_option .mx_StyledRadioButton', optionText);
    };

    const expectPollOptionVoteCount = (pollId: string, optionText: string, votes: number): void => {
        getPollOption(pollId, optionText).within(() => {
            cy.get('.mx_MPollBody_optionVoteCount').should('contain', `${votes} vote`);
        });
    };

    const bots = [];
    const botVotes = [];

    const botMultiVote = (bot: MatrixClient, optionId: string): void => {
        // populate botVotes with array(s) for each individual bot holding their answer(s)
        // allows for testing multiple bot votes
        if (!bots.includes(bot.credentials)) {
            bots.push(bot.credentials);
            botVotes.push([]);
        }
        if (!botVotes[bots.indexOf(bot.credentials)].includes(optionId)) {
            botVotes[bots.indexOf(bot.credentials)].push(optionId);
        }
    };

    const botVoteForOption = (bot: MatrixClient, roomId: string, pollId: string, optionText: string,
        type = "radio"): void => {
        getPollOption(pollId, optionText).within(ref => {
            cy.get(`input[type=${type}]`).invoke('attr', 'value').then(optionId => {
                let answer = [];
                if (type === "radio") {
                    answer = [optionId];
                } else if (!botVotes.includes(optionId)) {
                    botMultiVote(bot, optionId);
                    answer = botVotes[bots.indexOf(bot.credentials)];
                }
                const pollVote = PollResponseEvent.from(answer, pollId).serialize();
                bot.sendEvent(
                    roomId,
                    pollVote.type,
                    pollVote.content,
                );
            });
        });
    };

    beforeEach(() => {
        cy.enableLabsFeature("feature_thread");
        cy.window().then(win => {
            win.localStorage.setItem("mx_lhs_size", "0"); // Collapse left panel for these tests
        });
        cy.startSynapse("default").then(data => {
            synapse = data;

            cy.initTestUser(synapse, "Tom");
        });
    });

    afterEach(() => {
        cy.stopSynapse(synapse);
    });

    it("should be creatable and votable", () => {
        let bot: MatrixClient;
        cy.getBot(synapse, { displayName: "BotBob" }).then(_bot => {
            bot = _bot;
        });

        let roomId: string;
        cy.createRoom({}).then(_roomId => {
            roomId = _roomId;
            cy.inviteUser(roomId, bot.getUserId());
            cy.visit('/#/room/' + roomId);
            // wait until Bob joined
            cy.contains(".mx_TextualEvent", "BotBob joined the room").should("exist");
        });

        cy.openMessageComposerOptions().within(() => {
            cy.get('[aria-label="Poll"]').click();
        });

        cy.get('.mx_CompoundDialog').percySnapshotElement('Polls Composer');

        const pollParams = {
            title: 'Does the polls feature work?',
            options: ['Yes', 'No', 'Maybe'],
        };
        createPoll(pollParams);

        // Wait for message to send, get its ID and save as @pollId
        cy.contains(".mx_RoomView_body .mx_EventTile[data-scroll-tokens]", pollParams.title)
            .invoke("attr", "data-scroll-tokens").as("pollId");

        cy.get<string>("@pollId").then(pollId => {
            getPollTile(pollId).percySnapshotElement('Polls Timeline tile - no votes', { percyCSS: hideTimestampCSS });

            // Bot votes 'Maybe' in the poll
            botVoteForOption(bot, roomId, pollId, pollParams.options[2]);

            // no votes shown until I vote, check bots vote has arrived
            cy.get('.mx_MPollBody_totalVotes').should('contain', '1 vote cast');

            // vote 'Maybe'
            getPollOption(pollId, pollParams.options[2]).click('topLeft');
            // both me and bot have voted Maybe
            expectPollOptionVoteCount(pollId, pollParams.options[2], 2);

            // change my vote to 'Yes'
            getPollOption(pollId, pollParams.options[0]).click('topLeft');

            // 1 vote for yes
            expectPollOptionVoteCount(pollId, pollParams.options[0], 1);
            // 1 vote for maybe
            expectPollOptionVoteCount(pollId, pollParams.options[2], 1);

            // Bot updates vote to 'No'
            botVoteForOption(bot, roomId, pollId, pollParams.options[1]);

            // 1 vote for yes
            expectPollOptionVoteCount(pollId, pollParams.options[0], 1);
            // 1 vote for no
            expectPollOptionVoteCount(pollId, pollParams.options[0], 1);
            // 0 for maybe
            expectPollOptionVoteCount(pollId, pollParams.options[2], 0);
        });
    });

    it("should be editable from context menu if no votes have been cast", () => {
        let bot: MatrixClient;
        cy.getBot(synapse, { displayName: "BotBob" }).then(_bot => {
            bot = _bot;
        });

        let roomId: string;
        cy.createRoom({}).then(_roomId => {
            roomId = _roomId;
            cy.inviteUser(roomId, bot.getUserId());
            cy.visit('/#/room/' + roomId);
        });

        cy.openMessageComposerOptions().within(() => {
            cy.get('[aria-label="Poll"]').click();
        });

        const pollParams = {
            title: 'Does the polls feature work?',
            options: ['Yes', 'No', 'Maybe'],
        };
        createPoll(pollParams);

        // Wait for message to send, get its ID and save as @pollId
        cy.get(".mx_RoomView_body .mx_EventTile").contains(".mx_EventTile[data-scroll-tokens]", pollParams.title)
            .invoke("attr", "data-scroll-tokens").as("pollId");

        cy.get<string>("@pollId").then(pollId => {
            // Open context menu
            getPollTile(pollId).rightclick();

            // Select edit item
            cy.get('.mx_ContextualMenu').within(() => {
                cy.get('[aria-label="Edit"]').click();
            });

            // Expect poll editing dialog
            cy.get('.mx_PollCreateDialog');
        });
    });

    it("should not be editable from context menu if votes have been cast", () => {
        let bot: MatrixClient;
        cy.getBot(synapse, { displayName: "BotBob" }).then(_bot => {
            bot = _bot;
        });

        let roomId: string;
        cy.createRoom({}).then(_roomId => {
            roomId = _roomId;
            cy.inviteUser(roomId, bot.getUserId());
            cy.visit('/#/room/' + roomId);
        });

        cy.openMessageComposerOptions().within(() => {
            cy.get('[aria-label="Poll"]').click();
        });

        const pollParams = {
            title: 'Does the polls feature work?',
            options: ['Yes', 'No', 'Maybe'],
        };
        createPoll(pollParams);

        // Wait for message to send, get its ID and save as @pollId
        cy.get(".mx_RoomView_body .mx_EventTile").contains(".mx_EventTile[data-scroll-tokens]", pollParams.title)
            .invoke("attr", "data-scroll-tokens").as("pollId");

        cy.get<string>("@pollId").then(pollId => {
            // Bot votes 'Maybe' in the poll
            botVoteForOption(bot, roomId, pollId, pollParams.options[2]);

            // wait for bot's vote to arrive
            cy.get('.mx_MPollBody_totalVotes').should('contain', '1 vote cast');

            // Open context menu
            getPollTile(pollId).rightclick();

            // Select edit item
            cy.get('.mx_ContextualMenu').within(() => {
                cy.get('[aria-label="Edit"]').click();
            });

            // Expect error dialog
            cy.get('.mx_ErrorDialog');
        });
    });

    it("should be displayed correctly in thread panel", () => {
        let botBob: MatrixClient;
        let botCharlie: MatrixClient;
        cy.getBot(synapse, { displayName: "BotBob" }).then(_bot => {
            botBob = _bot;
        });
        cy.getBot(synapse, { displayName: "BotCharlie" }).then(_bot => {
            botCharlie = _bot;
        });

        let roomId: string;
        cy.createRoom({}).then(_roomId => {
            roomId = _roomId;
            cy.inviteUser(roomId, botBob.getUserId());
            cy.inviteUser(roomId, botCharlie.getUserId());
            cy.visit('/#/room/' + roomId);
            // wait until the bots joined
            cy.contains(".mx_TextualEvent", "and one other were invited and joined").should("exist");
        });

        cy.openMessageComposerOptions().within(() => {
            cy.get('[aria-label="Poll"]').click();
        });

        const pollParams = {
            title: 'Does the polls feature work?',
            options: ['Yes', 'No', 'Maybe'],
        };
        createPoll(pollParams);

        // Wait for message to send, get its ID and save as @pollId
        cy.contains(".mx_RoomView_body .mx_EventTile[data-scroll-tokens]", pollParams.title)
            .invoke("attr", "data-scroll-tokens").as("pollId");

        cy.get<string>("@pollId").then(pollId => {
            // Bob starts thread on the poll
            botBob.sendMessage(roomId, pollId, {
                body: "Hello there",
                msgtype: "m.text",
            });

            // open the thread summary
            cy.get(".mx_RoomView_body .mx_ThreadSummary").click();

            // Bob votes 'Maybe' in the poll
            botVoteForOption(botBob, roomId, pollId, pollParams.options[2]);
            // Charlie votes 'No'
            botVoteForOption(botCharlie, roomId, pollId, pollParams.options[1]);

            // no votes shown until I vote, check votes have arrived in main tl
            cy.get('.mx_RoomView_body .mx_MPollBody_totalVotes').should('contain', '2 votes cast');
            // and thread view
            cy.get('.mx_ThreadView .mx_MPollBody_totalVotes').should('contain', '2 votes cast');

            cy.get('.mx_RoomView_body').within(() => {
                // vote 'Maybe' in the main timeline poll
                getPollOption(pollId, pollParams.options[2]).click('topLeft');
                // both me and bob have voted Maybe
                expectPollOptionVoteCount(pollId, pollParams.options[2], 2);
            });

            cy.get('.mx_ThreadView').within(() => {
                // votes updated in thread view too
                expectPollOptionVoteCount(pollId, pollParams.options[2], 2);
                // change my vote to 'Yes'
                getPollOption(pollId, pollParams.options[0]).click('topLeft');
            });

            // Bob updates vote to 'No'
            botVoteForOption(botBob, roomId, pollId, pollParams.options[1]);

            // me: yes, bob: no, charlie: no
            const expectVoteCounts = () => {
                // I voted yes
                expectPollOptionVoteCount(pollId, pollParams.options[0], 1);
                // Bob and Charlie voted no
                expectPollOptionVoteCount(pollId, pollParams.options[1], 2);
                // 0 for maybe
                expectPollOptionVoteCount(pollId, pollParams.options[2], 0);
            };

            // check counts are correct in main timeline tile
            cy.get('.mx_RoomView_body').within(() => {
                expectVoteCounts();
            });
            // and in thread view tile
            cy.get('.mx_ThreadView').within(() => {
                expectVoteCounts();
            });
        });
    });

    describe("Multiple choice polls", () => {
        beforeEach(() => {
            botVotes.length = 0;
            bots.length = 0;
        });

        it("should be creatable and allow voting for multiple options", () => {
            let botBob: MatrixClient;
            let botCharlie: MatrixClient;
            cy.getBot(synapse, { displayName: "BotBob" }).then(_bot => {
                botBob = _bot;
            });
            cy.getBot(synapse, { displayName: "BotCharlie" }).then(_bot => {
                botCharlie = _bot;
            });
            let roomId: string;
            cy.createRoom({}).then(_roomId => {
                roomId = _roomId;
                cy.inviteUser(roomId, botBob.getUserId());
                cy.inviteUser(roomId, botCharlie.getUserId());
                cy.visit('/#/room/' + roomId);
                // wait until bots joined
                cy.contains(".mx_TextualEvent", "BotBob and one other were invited and joined").should("exist");
            });

            cy.openMessageComposerOptions().within(() => {
                cy.get('[aria-label="Poll"]').click();
            });

            cy.get('.mx_CompoundDialog').percySnapshotElement('Polls Composer');

            const pollParams = {
                title: 'Does the polls feature work with multiple selections?',
                options: ['Yes', 'Indeed', 'Definitely'],
                multiSelect: true,
            };
            createPoll(pollParams);

            // Wait for message to send, get its ID and save as @pollId
            cy.contains(".mx_RoomView_body .mx_EventTile[data-scroll-tokens]", pollParams.title)
                .invoke("attr", "data-scroll-tokens").as("pollId");

            cy.get<string>("@pollId").then(pollId => {
                getPollTile(pollId).percySnapshotElement('Polls Timeline tile - no votes',
                    { percyCSS: hideTimestampCSS });

                // selected max possible number of votes
                cy.get('.mx_MPollBody_totalVotes').should('contain', 'you have 3 votes remaining');

                // Bob votes 'Yes' in the poll
                botVoteForOption(botBob, roomId, pollId, pollParams.options[0], "checkbox");

                // Charlie votes for 'Indeed'
                botVoteForOption(botCharlie, roomId, pollId, pollParams.options[1], "checkbox");

                // no votes shown until I vote, check bots vote has arrived
                cy.get('.mx_MPollBody_totalVotes').should('contain', '2 votes cast');

                // I vote 'Definitely'
                getPollOption(pollId, pollParams.options[2]).click('topLeft');

                // 1 vote for each option
                expectPollOptionVoteCount(pollId, pollParams.options[0], 1);
                expectPollOptionVoteCount(pollId, pollParams.options[1], 1);
                expectPollOptionVoteCount(pollId, pollParams.options[2], 1);

                // I vote 'Yes'
                getPollOption(pollId, pollParams.options[0]).click('left');
                // I vote 'Indeed'
                getPollOption(pollId, pollParams.options[1]).click('bottom');

                // I have no votes left
                cy.get('.mx_MPollBody_totalVotes').should('contain', 'Based on 5 votes - you have no votes remaining');

                // Charlie votes for 'Yes'
                botVoteForOption(botCharlie, roomId, pollId, pollParams.options[0], "checkbox");

                // each participant has voted for 'Yes'
                expectPollOptionVoteCount(pollId, pollParams.options[0], 3);
                // Charlie and I voted 'Indeed'
                expectPollOptionVoteCount(pollId, pollParams.options[1], 2);
                // I voted for 'Definitely'
                expectPollOptionVoteCount(pollId, pollParams.options[2], 1);
            });
        });

        it("should have the correct number of possible selections", () => {
            let roomId: string;
            cy.createRoom({}).then(_roomId => {
                roomId = _roomId;
                cy.visit('/#/room/' + roomId);
            });

            cy.openMessageComposerOptions().within(() => {
                cy.get('[aria-label="Poll"]').click();
            });

            const pollParams = {
                title: 'Does this count an empty option?',
                options: ['Nah', 'Nope', ' '],
                multiSelect: true,
            };
            createPoll(pollParams);

            cy.get('.mx_MPollBody_totalVotes').should('contain', 'you have 2 votes remaining');
        });

        it("should allow deselecting votes to vote for another option", () => {
            let roomId: string;
            cy.createRoom({}).then(_roomId => {
                roomId = _roomId;
                cy.visit('/#/room/' + roomId);
            });

            cy.openMessageComposerOptions().within(() => {
                cy.get('[aria-label="Poll"]').click();
            });

            cy.get('.mx_CompoundDialog').percySnapshotElement('Polls Composer');

            const pollParams = {
                title: 'Can I deselect my votes?',
                options: ['Yes', 'Indeed', 'Definitely'],
                multiSelect: true,
                maxSelections: '2',
            };
            createPoll(pollParams);

            // Wait for message to send, get its ID and save as @pollId
            cy.contains(".mx_RoomView_body .mx_EventTile[data-scroll-tokens]", pollParams.title)
                .invoke("attr", "data-scroll-tokens").as("pollId");

            cy.get<string>("@pollId").then(pollId => {
                // vote 'Yes'
                getPollOption(pollId, pollParams.options[0]).click('topRight');

                // 1 vote for 'Yes'
                expectPollOptionVoteCount(pollId, pollParams.options[0], 1);
                // check correct number of remaining votes
                cy.get('.mx_MPollBody_totalVotes').should('contain', 'you have 1 vote remaining');

                // also vote for 'Indeed'
                getPollOption(pollId, pollParams.options[1]).click('center');

                // 1 vote for 'Indeed'
                expectPollOptionVoteCount(pollId, pollParams.options[1], 1);
                // check correct number of remaining votes
                cy.get('.mx_MPollBody_totalVotes').should('contain', 'you have no votes remaining');

                // no further votes allowed
                getPollOption(pollId, pollParams.options[2]).click('center');
                // no vote for 'Definitely'
                expectPollOptionVoteCount(pollId, pollParams.options[2], 0);

                // deselect 'Indeed'
                getPollOption(pollId, pollParams.options[1]).click('left');
                // no votes for 'Indeed'
                expectPollOptionVoteCount(pollId, pollParams.options[1], 0);
                // check correct number of remaining votes
                cy.get('.mx_MPollBody_totalVotes').should('contain', 'you have 1 vote remaining');

                // vote for 'Definitely'
                getPollOption(pollId, pollParams.options[2]).click('right');
                // 1 vote for 'Definitely'
                expectPollOptionVoteCount(pollId, pollParams.options[2], 1);
                // check correct number of remaining votes
                cy.get('.mx_MPollBody_totalVotes').should('contain', 'you have no votes remaining');
            });
        });
    });
});
