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
import { SettingLevel } from "../../../src/settings/SettingLevel";
import { Layout } from "../../../src/settings/enums/Layout";

describe("Audio player", () => {
    let homeserver: HomeserverInstance;
    let roomId: string;
    const TEST_USER = "Hanako";

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

    const takeSnapshots = (detail: string) => {
        // Check the status of the seek bar
        cy.get(".mx_AudioPlayer_seek input[type='range']").should("exist");

        // Assert that the play button is rendered
        cy.get("[data-testid='play-pause-button'][aria-label='Play']").should("exist");

        // Assert that the pause button is not rendered
        cy.get("[data-testid='play-pause-button'][aria-label='Pause']").should("not.exist");

        // Take snapshots in IRC, bubble, modern, and compact modern layout, outputting log for reference
        cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.IRC);
        cy.get(".mx_MAudioBody").percySnapshotElement(detail + " on IRC layout");
        cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Bubble);
        cy.get(".mx_MAudioBody").percySnapshotElement(detail + " on bubble layout");
        cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Group);
        cy.get(".mx_MAudioBody").percySnapshotElement(detail + " on group layout");
        cy.setSettingValue("useCompactLayout", null, SettingLevel.DEVICE, true);
        cy.get(".mx_MAudioBody").percySnapshotElement(detail + " on compact group layout");

        // Reset compact layout setting
        cy.setSettingValue("useCompactLayout", null, SettingLevel.DEVICE, false);
    };

    beforeEach(() => {
        cy.startHomeserver("default").then((data) => {
            homeserver = data;
            cy.initTestUser(homeserver, TEST_USER).then(() =>
                cy.createRoom({}).then((_roomId) => {
                    roomId = _roomId;
                }),
            );
        });

        cy.injectAxe();
    });

    afterEach(() => {
        cy.stopHomeserver(homeserver);
    });

    it("should render with one second audio file with a long file name", () => {
        cy.visit("/#/room/" + roomId);
        cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Group);

        // Wait until configuration is finished
        cy.contains(
            ".mx_RoomView_body .mx_GenericEventListSummary[data-layout=group] .mx_GenericEventListSummary_summary",
            "created and configured the room.",
        ).should("exist");

        // Upload one second audio file with a long file name
        uploadFile("cypress/fixtures/1sec-long-name-audio-file.ogg");

        cy.get(".mx_RoomView_MessageList").within(() => {
            // Detect the audio file
            cy.get(".mx_EventTile_mediaLine .mx_MAudioBody").within(() => {
                // Assert that the audio player is rendered
                cy.get(".mx_AudioPlayer_container").within(() => {
                    // Assert that the audio file information is rendered
                    cy.get(".mx_AudioPlayer_mediaInfo").within(() => {
                        cy.get(".mx_AudioPlayer_mediaName").should("have.text", "1sec-long-name-audio-file.ogg");
                        cy.contains(".mx_AudioPlayer_byline", "00:01").should("exist");
                        cy.contains(".mx_AudioPlayer_byline", "(3.56 KB)").should("exist"); // actual size
                    });

                    // Assert that the play button is rendered
                    cy.get("[data-testid='play-pause-button'][aria-label='Play']").should("exist");
                });
            });

            // Take snapshots (light theme)
            takeSnapshots("Audio player (light theme)");

            // Take snapshots (light theme, monospace font): assert that timer is not wrapped
            cy.setSettingValue("useSystemFont", null, SettingLevel.DEVICE, true);
            cy.setSettingValue("systemFont", null, SettingLevel.DEVICE, "monospace");
            takeSnapshots("Audio player (light theme, monospace)");
            // Reset font setting
            cy.setSettingValue("useSystemFont", null, SettingLevel.DEVICE, false);

            // Take snapshots (dark theme)
            cy.setSettingValue("theme", null, SettingLevel.ACCOUNT, "dark");
            takeSnapshots("Audio player (dark theme)");
        });
    });

    it("should play audio file", () => {
        cy.visit("/#/room/" + roomId);
        cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Group);

        // Wait until configuration is finished
        cy.contains(
            ".mx_RoomView_body .mx_GenericEventListSummary[data-layout=group] .mx_GenericEventListSummary_summary",
            "created and configured the room.",
        ).should("exist");

        // Upload an audio file
        uploadFile("cypress/fixtures/1sec.ogg");

        cy.get(".mx_RoomView_MessageList").within(() => {
            cy.get(".mx_EventTile_mediaLine .mx_MAudioBody").within(() => {
                // Assert that the audio player is rendered
                cy.get(".mx_AudioPlayer_container").within(() => {
                    // Assert that the counter is zero before clicking the play button
                    cy.contains(".mx_AudioPlayer_seek [role='timer']", "00:00").should("exist");

                    // Click the play button
                    cy.get("[data-testid='play-pause-button'][aria-label='Play']").click();

                    // Assert that the pause button is rendered
                    cy.get("[data-testid='play-pause-button'][aria-label='Pause']").should("exist");

                    // Assert that the timer is reset when the audio file finished playing
                    cy.contains(".mx_AudioPlayer_seek [role='timer']", "00:00").should("exist");

                    // Assert that the play button is rendered
                    cy.get("[data-testid='play-pause-button'][aria-label='Play']").should("exist");
                });
            });
        });
    });

    it("should download audio file", () => {
        cy.visit("/#/room/" + roomId);
        cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Group);

        // Wait until configuration is finished
        cy.contains(
            ".mx_RoomView_body .mx_GenericEventListSummary[data-layout=group] .mx_GenericEventListSummary_summary",
            "created and configured the room.",
        ).should("exist");

        // Upload an audio file
        uploadFile("cypress/fixtures/1sec.ogg");

        cy.get(".mx_RoomView_MessageList").within(() => {
            // Assert the audio player is rendered
            cy.get(".mx_EventTile_last .mx_AudioPlayer_container").should("exist");

            cy.get(".mx_EventTile_last")
                .realHover()
                .within(() => {
                    // Click "Download" button on MessageActionBar
                    cy.get('[aria-label="Download"]').click({ force: false });

                    // Assert that the file was downloaded
                    cy.readFile("cypress/downloads/1sec.ogg").should("exist");
                });
        });
    });

    it("should reply to audio file with another audio file", () => {
        cy.visit("/#/room/" + roomId);
        cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Group);

        // Wait until configuration is finished
        cy.contains(
            ".mx_RoomView_body .mx_GenericEventListSummary[data-layout=group] .mx_GenericEventListSummary_summary",
            "created and configured the room.",
        ).should("exist");

        // Upload one second audio file with a long file name
        uploadFile("cypress/fixtures/1sec-long-name-audio-file.ogg");

        cy.get(".mx_RoomView_MessageList").within(() => {
            // Assert the audio player is rendered
            cy.get(".mx_EventTile_last .mx_AudioPlayer_container").should("exist");

            cy.get(".mx_EventTile_last")
                .realHover()
                .within(() => {
                    // Click "Reply" button on MessageActionBar
                    cy.get('[aria-label="Reply"]').click({ force: false });
                });
        });

        // Reply to the player with another audio file
        uploadFile("cypress/fixtures/1sec.ogg");

        // Assert that audio file is rendered as file button inside ReplyChain
        cy.get(".mx_RoomView_MessageList").within(() => {
            cy.get(".mx_EventTile_last").within(() => {
                cy.get(".mx_ReplyChain").within(() => {
                    cy.get(".mx_MFileBody_info[role='button']").within(() => {
                        // Asser that the file button has file name
                        cy.get(".mx_MFileBody_info_filename").should("exist");
                    });
                });
            });
        });

        // Take snapshots
        takeSnapshots("Reply to audio player");
    });

    it("should create reply chain of audio files", () => {
        cy.visit("/#/room/" + roomId);
        cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Group);

        // Wait until configuration is finished
        cy.contains(
            ".mx_RoomView_body .mx_GenericEventListSummary[data-layout=group] .mx_GenericEventListSummary_summary",
            "created and configured the room.",
        ).should("exist");

        // Upload one second audio file with a long file name
        uploadFile("cypress/fixtures/1sec-long-name-audio-file.ogg");

        cy.get(".mx_RoomView_MessageList").within(() => {
            // Assert the audio player is rendered
            cy.get(".mx_EventTile_last .mx_AudioPlayer_container").should("exist");

            cy.get(".mx_EventTile_last")
                .realHover()
                .within(() => {
                    // Click "Reply" button on MessageActionBar
                    cy.get('[aria-label="Reply"]').click({ force: false });
                });
        });

        // Reply to the player with another audio file
        uploadFile("cypress/fixtures/1sec.ogg");

        cy.get(".mx_RoomView_MessageList").within(() => {
            cy.get(".mx_EventTile_last").within(() => {
                // Assert that audio file is rendered as file button
                cy.get(".mx_ReplyChain").within(() => {
                    cy.get(".mx_MFileBody_info[role='button']").within(() => {
                        // Asser that the file button has file name
                        cy.get(".mx_MFileBody_info_filename").should("exist");
                    });
                });
            });

            cy.get(".mx_EventTile_last")
                .realHover()
                .within(() => {
                    // Again, click "Reply" button on MessageActionBar
                    cy.get('[aria-label="Reply"]').click({ force: false });
                });
        });

        // Reply to the player with another audio file
        uploadFile("cypress/fixtures/1sec-long-name-audio-file.ogg");

        cy.get(".mx_RoomView_MessageList").within(() => {
            cy.get(".mx_EventTile_last").within(() => {
                // Assert that there are two "ReplyChain"
                cy.get(".mx_ReplyChain").should("have.length", 2);

                // Assert that one line contains the user name
                cy.contains(".mx_ReplyChain .mx_ReplyTile_sender", TEST_USER);

                // Assert that the other line contains the file button
                cy.get(".mx_ReplyChain .mx_MFileBody").within(() => {
                    // Assert that audio file is rendered as file button
                    cy.get(".mx_MFileBody_info[role='button']").within(() => {
                        // Asser that the file button has file name
                        cy.get(".mx_MFileBody_info_filename").should("exist");
                    });
                });

                // Click "In reply to"
                cy.get(".mx_ReplyChain .mx_ReplyChain_show").click();

                // Assert that "In reply to" on the first ReplyChain is replaced with the audio file sent at first
                cy.get("blockquote.mx_ReplyChain:first-of-type .mx_ReplyChain_show").should("not.exist");
                cy.get(".mx_ReplyChain").should("have.length", 2);
                cy.get("blockquote.mx_ReplyChain:first-of-type").within(() => {
                    // Assert that audio file is rendered as file button
                    cy.get(".mx_MFileBody_info[role='button']").within(() => {
                        // Asser that the file button contains the name of the file sent at first
                        cy.contains(".mx_MFileBody_info_filename", "1sec-long-name");
                    });
                });

                // Take snapshots
                takeSnapshots("Audio player of ReplyChain");
            });
        });
    });

    it("should render, play, and reply on a thread", () => {
        cy.visit("/#/room/" + roomId);
        cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Group);

        // Wait until configuration is finished
        cy.contains(
            ".mx_RoomView_body .mx_GenericEventListSummary[data-layout=group] .mx_GenericEventListSummary_summary",
            "created and configured the room.",
        ).should("exist");

        // Upload one second audio file with a long file name
        uploadFile("cypress/fixtures/1sec-long-name-audio-file.ogg");

        cy.get(".mx_RoomView_body .mx_RoomView_MessageList").within(() => {
            // Assert the audio player is rendered
            cy.get(".mx_EventTile_last .mx_AudioPlayer_container").should("exist");

            cy.get(".mx_EventTile_last")
                .realHover()
                .within(() => {
                    // Click "Reply in thread" button on MessageActionBar
                    cy.get('[aria-label="Reply in thread"]').click({ force: false });
                });
        });

        // Assert that the thread is visible
        cy.get(".mx_ThreadView").should("be.visible");

        // Take snapshots of audio players on main timeline with ThreadPanel opened
        cy.get(".mx_RoomView_body .mx_RoomView_MessageList").within(() => {
            takeSnapshots("Audio player on narrow main timeline");
        });

        cy.get(".mx_ThreadView").within(() => {
            // Take snapshots of audio player on a thread
            takeSnapshots("Audio player on a thread");

            cy.get(".mx_AudioPlayer_container").within(() => {
                // Assert that the counter is zero before clicking the play button
                cy.contains(".mx_AudioPlayer_seek [role='timer']", "00:00").should("exist");

                // Click the play button
                cy.get("[data-testid='play-pause-button'][aria-label='Play']").click();

                // Assert that the pause button is rendered
                cy.get("[data-testid='play-pause-button'][aria-label='Pause']").should("exist");

                // Assert that the timer is reset when the audio file finished playing
                cy.contains(".mx_AudioPlayer_seek [role='timer']", "00:00").should("exist");

                // Assert that the play button is rendered
                cy.get("[data-testid='play-pause-button'][aria-label='Play']").should("exist");
            });

            cy.get(".mx_EventTile_last")
                .realHover()
                .within(() => {
                    // Click the reply button
                    cy.get('[aria-label="Reply"]').click({ force: false });
                });

            cy.get(".mx_MessageComposer--compact").within(() => {
                // Assert that the reply preview is rendered on the message composer
                cy.get(".mx_ReplyPreview").within(() => {
                    // Assert that the reply preview contains audio ReplyTile
                    cy.get(".mx_ReplyTile_audio").within(() => {
                        // Assert that the ReplyTile has the file info button
                        cy.get(".mx_MFileBody_info[role='button']").should("exist");
                    });
                });

                // Select :smile: emoji and send it
                cy.get("[data-testid='basicmessagecomposer']").type(":smile:");
                cy.get(".mx_Autocomplete_Completion[aria-selected='true']").click();
                cy.get("[data-testid='basicmessagecomposer']").type("{enter}");
            });

            cy.get(".mx_EventTile_last").within(() => {
                cy.get(".mx_ReplyTile_audio").within(() => {
                    cy.get(".mx_MFileBody_info[role='button']").within(() => {
                        // Assert that the file name is rendered on the file button
                        cy.contains(".mx_MFileBody_info_filename", "1sec-long-name");
                    });
                });
            });
        });
    });
});
