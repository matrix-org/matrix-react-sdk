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
import { MatrixClient } from "matrix-js-sdk/src/client";

import { SynapseInstance } from "../../plugins/synapsedocker";
import Chainable = Cypress.Chainable;

const NUM_USERS = 200;

const cypressCommandTimings = [];

Cypress.on('test:after:run', (attributes) => {
    console.log('Test "%s" has finished in %dms',
        attributes.title, attributes.duration);
    console.table(cypressCommandTimings);
    cypressCommandTimings.length = 0;
});

Cypress.on('command:start', (c) => {
    cypressCommandTimings.push({
        name: c.attributes.name,
        started: +new Date(),
    });
});

Cypress.on('command:end', (c) => {
    const lastCommand = cypressCommandTimings[cypressCommandTimings.length - 1];

    if (lastCommand.name !== c.attributes.name) {
        throw new Error('Last command is wrong');
    }

    lastCommand.endedAt = +new Date();
    lastCommand.elapsed = lastCommand.endedAt - lastCommand.started;
});

describe("Create a poll in a large room", () => {
    let synapse: SynapseInstance;

    beforeEach(() => {
        function createUsers(synapse: SynapseInstance, roomId: string, userNumber: number) {
            if (userNumber >= NUM_USERS) {
                return;
            }

            const userName = `user${userNumber}`;
            cy.getBot(synapse, { displayName: userName, startClient: false }).as(userName).then(
                user => cy.inviteUser(roomId, user.getUserId()).then(
                    () => cy.botJoinRoom(user, roomId).then(
                        () => createUsers(synapse, roomId, userNumber + 1),
                    ),
                ),
            );
        }

        cy.startSynapse("default").then(
            _synapse => {
                synapse = _synapse;
                cy.initTestUser(synapse, "Jim").then(
                    () => cy.createRoom({ name: "Large stressful room" }).as("roomId").then(
                        roomId => createUsers(synapse, roomId, 0),
                    ),
                );
            },
        );
    });

    afterEach(() => {
        cy.stopSynapse(synapse);
    });

    it("should allow many people to vote in a poll", () => {
        cy.get<string>("@roomId").then(roomId => {
            cy.visit('/#/room/' + roomId);

            cy.openMessageComposerOptions().within(() => {
                cy.get('[aria-label="Poll"]').click();
            });

            const pollParams = {
                title: 'Does the polls feature work?',
                options: ['Yes', 'No', 'Maybe'],
            };
            createPoll(pollParams);

            cy.get(".mx_RoomView_body .mx_EventTile").contains(
                ".mx_EventTile[data-scroll-tokens]",
                pollParams.title,
            ).invoke("attr", "data-scroll-tokens").as("pollId");

            cy.get<string>("@pollId").then(pollId => {
                // All the bots vote for Maybe
                for (let num = 0; num < NUM_USERS; num++) {
                    cy.get<MatrixClient>(`@user${num}`).then((user: MatrixClient) =>
                        botVoteForOption(user, roomId, pollId, pollParams.options[2]),
                    );
                }

                // Wait until we can see all the votes have been registered
                cy.get(
                    '.mx_MPollBody_totalVotes',
                    { timeout: NUM_USERS * 200 },
                ).should('contain', `${NUM_USERS} votes cast`);

                // We vote No
                getPollOption(pollId, pollParams.options[1]).click('topLeft');

                // The vote counts are visible
                expectPollOptionVoteCount(pollId, pollParams.options[0], 0);
                expectPollOptionVoteCount(pollId, pollParams.options[1], 1);
                expectPollOptionVoteCount(pollId, pollParams.options[2], NUM_USERS);
            });
        });
    });
});

type CreatePollOptions = {
    title: string;
    options: string[];
};

const createPoll = ({ title, options }: CreatePollOptions) => {
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
    });
    cy.get('.mx_Dialog button[type="submit"]').click();
};

const getPollTile = (pollId: string): Chainable<JQuery> => {
    return cy.get(`.mx_EventTile[data-scroll-tokens="${pollId}"]`);
};

const getPollOption = (pollId: string, optionText: string): Chainable<JQuery> => {
    return getPollTile(pollId).contains('.mx_MPollBody_option .mx_StyledRadioButton', optionText);
};

const botVoteForOption = (bot: MatrixClient, roomId: string, pollId: string, optionText: string): void => {
    getPollOption(pollId, optionText).within(_ref => {
        cy.get('input[type="radio"]').invoke('attr', 'value').then(optionId => {
            const pollVote = PollResponseEvent.from([optionId], pollId).serialize();
            bot.sendEvent(
                roomId,
                pollVote.type,
                pollVote.content,
            );
        });
    });
};

const expectPollOptionVoteCount = (pollId: string, optionText: string, votes: number): void => {
    getPollOption(pollId, optionText).within(() => {
        cy.get('.mx_MPollBody_optionVoteCount').should('contain', `${votes} vote`);
    });
};
