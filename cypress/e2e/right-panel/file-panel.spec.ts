/*
Copyright 2023 Suguru Hirahara

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

import { HomeserverInstance } from "../../plugins/utils/homeserver";
import Chainable = Cypress.Chainable;

const ROOM_NAME = "Test room";
const NAME = "Alice";

const viewRoomSummaryByName = (name: string): Chainable<JQuery<HTMLElement>> => {
    cy.viewRoomByName(name);
    cy.get(".mx_RightPanel_roomSummaryButton").click();
    return checkRoomSummaryCard(name);
};

const checkRoomSummaryCard = (name: string): Chainable<JQuery<HTMLElement>> => {
    cy.get(".mx_RoomSummaryCard").should("have.length", 1);
    return cy.get(".mx_BaseCard_header").should("contain", name);
};

const uploadFile = (file: string) => {
    // Upload a file from the message composer
    cy.get(".mx_MessageComposer_actions input[type='file']").selectFile(file, { force: true });

    cy.get(".mx_Dialog").within(() => {
        // Click "Upload" button
        cy.get("[data-testid='dialog-primary-button']").should("have.text", "Upload").click();
    });

    // Wait until the file is sent
    cy.get(".mx_RoomView_statusArea_expanded").should("not.exist");
    cy.get(".mx_EventTile.mx_EventTile_last .mx_EventTile_receiptSent").should("exist");
};

describe("FilePanel", () => {
    let homeserver: HomeserverInstance;

    beforeEach(() => {
        cy.startHomeserver("default").then((data) => {
            homeserver = data;
            cy.initTestUser(homeserver, NAME).then(() =>
                cy.window({ log: false }).then(() => {
                    cy.createRoom({ name: ROOM_NAME });
                }),
            );
        });

        // Open the file panel
        viewRoomSummaryByName(ROOM_NAME);
        cy.get(".mx_RoomSummaryCard_icon_files").click();
        cy.get(".mx_FilePanel").should("have.length", 1);
    });

    afterEach(() => {
        cy.stopHomeserver(homeserver);
    });

    describe("render", () => {
        it("should list tiles on the panel", () => {
            // Upload multiple files
            uploadFile("cypress/fixtures/riot.png"); // Image
            uploadFile("cypress/fixtures/1sec.ogg"); // Audio
            uploadFile("cypress/fixtures/matrix-org-client-versions.json"); // JSON

            cy.get(".mx_RoomView_body").within(() => {
                // Ensure all of the file were uploaded and rendered
                cy.get(".mx_EventTile[data-layout='group']").should("have.length", 3);

                // Ensure the image exists and has the alt string
                cy.get(".mx_EventTile[data-layout='group'] img[alt='riot.png']").should("exist");

                // Ensure the audio player is rendered
                cy.get(".mx_EventTile[data-layout='group'] .mx_AudioPlayer_container").should("exist");

                // Ensure the file button exists
                cy.contains(".mx_EventTile_last[data-layout='group'] .mx_MFileBody", ".json").should("exist");
            });

            cy.get(".mx_FilePanel").within(() => {
                cy.get(".mx_RoomView_MessageList").within(() => {
                    // Ensure that data-layout attribute is not applied to file tiles on the panel
                    cy.get(".mx_EventTile[data-layout='group']").should("not.exist");

                    // Ensure all of the file tiles are rendered
                    cy.get(".mx_EventTile").should("have.length", 3);

                    // Ensure the download links are rendered
                    cy.get(".mx_MFileBody_download").should("have.length", 3);

                    // Ensure the sender of the files is rendered on all of the tiles
                    cy.get(".mx_EventTile_senderDetails .mx_DisambiguatedProfile_displayName").should("have.length", 3);
                    cy.contains(".mx_EventTile_senderDetails .mx_DisambiguatedProfile_displayName", NAME);

                    // Detect the image file
                    cy.get(".mx_EventTile_mediaLine.mx_EventTile_image").within(() => {
                        // Ensure the image is specified as thumbnail and has the alt string
                        cy.get(".mx_MImageBody").within(() => {
                            cy.get("img[class='mx_MImageBody_thumbnail']").should("exist");
                            cy.get("img[alt='riot.png']").should("exist");
                        });
                    });

                    // Detect the audio file
                    cy.get(".mx_EventTile_mediaLine .mx_MAudioBody").within(() => {
                        // Ensure the audio player is rendered
                        cy.get(".mx_AudioPlayer_container").within(() => {
                            // Ensure the play button is rendered
                            cy.get("[data-testid='play-pause-button']").should("exist");
                        });
                    });

                    // Detect the JSON file
                    // Ensure the tile is rendered as a button
                    cy.get(".mx_EventTile_mediaLine .mx_MFileBody .mx_MFileBody_info[role='button']").within(() => {
                        // Ensure the file name is rendered inside the button
                        // File name: matrix-org-client-versions.json
                        cy.contains(".mx_MFileBody_info_filename", "matrix-org");
                    });
                });

                // Exclude timestamps and read markers from snapshot
                const percyCSS = ".mx_MessageTimestamp, .mx_RoomView_myReadMarker { visibility: hidden !important; }";
                cy.get(".mx_RoomView_MessageList").percySnapshotElement("File tiles on FilePanel", { percyCSS });
            });
        });

        it("should render the audio pleyer and play the audio file on the panel", () => {
            // Upload an image file
            uploadFile("cypress/fixtures/1sec.ogg");

            cy.get(".mx_FilePanel").within(() => {
                cy.get(".mx_RoomView_MessageList").within(() => {
                    // Detect the audio file
                    cy.get(".mx_EventTile_mediaLine .mx_MAudioBody").within(() => {
                        // Ensure the audio player is rendered
                        cy.get(".mx_AudioPlayer_container").within(() => {
                            // Ensure the audio file information is rendered
                            cy.get(".mx_AudioPlayer_mediaInfo").within(() => {
                                cy.get(".mx_AudioPlayer_mediaName").should("have.text", "1sec.ogg");
                                cy.contains(".mx_AudioPlayer_byline", "00:01").should("exist");
                                cy.contains(".mx_AudioPlayer_byline", "(3.56 KB)").should("exist"); // actual size
                            });

                            // Ensure the counter is zero before clicking the play button
                            cy.contains(".mx_AudioPlayer_seek [role='timer']", "00:00").should("exist");

                            // Click the play button
                            cy.get("[data-testid='play-pause-button'][aria-label='Play']").click();

                            // Ensure the pause button is rendered
                            cy.get("[data-testid='play-pause-button'][aria-label='Pause']").should("exist");

                            // Ensure the timer is reset when the audio file finished playing
                            cy.contains(".mx_AudioPlayer_seek [role='timer']", "00:00").should("exist");

                            // Ensure the play button is rendered
                            cy.get("[data-testid='play-pause-button'][aria-label='Play']").should("exist");
                        });
                    });
                });
            });
        });
    });

    describe("download", () => {
        it("should download an image via the link on the panel", () => {
            // Upload an image file
            uploadFile("cypress/fixtures/riot.png");

            cy.get(".mx_FilePanel").within(() => {
                cy.get(".mx_RoomView_MessageList").within(() => {
                    // Detect the image file on the panel
                    cy.get(".mx_EventTile_mediaLine.mx_EventTile_image .mx_MImageBody").within(() => {
                        // Click the anchor link (not the image itself)
                        cy.get(".mx_MFileBody_download a").click();
                        cy.readFile("cypress/downloads/riot.png").should("exist");
                    });
                });
            });
        });
    });
});
