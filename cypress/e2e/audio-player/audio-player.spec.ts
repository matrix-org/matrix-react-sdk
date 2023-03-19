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

    // FIXME: hide mx_SeekBar because flaky - see https://github.com/vector-im/element-web/issues/24898
    const percyCSS = ".mx_SeekBar { visibility: hidden !important; }";

    const visitRoom = () => {
        cy.visit("/#/room/" + roomId);
        cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Group);

        // Wait until configuration is finished
        cy.contains(
            ".mx_RoomView_body .mx_GenericEventListSummary[data-layout='group'] .mx_GenericEventListSummary_summary",
            "created and configured the room.",
        ).should("exist");
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

    const checkPlayerFilenameLong = () => {
        // Detect the audio file
        cy.get(".mx_EventTile_mediaLine .mx_MAudioBody").within(() => {
            // Assert that the audio player is rendered
            cy.get(".mx_AudioPlayer_container").within(() => {
                // Assert that media information is rendered
                cy.get(".mx_AudioPlayer_mediaInfo").within(() => {
                    cy.get(".mx_AudioPlayer_mediaName").should("have.text", "1sec-long-name-audio-file.ogg");
                    cy.contains(".mx_AudioPlayer_byline", "00:01").should("exist");
                    cy.contains(".mx_AudioPlayer_byline", "(3.56 KB)").should("exist"); // actual size
                });

                // Assert that the play button is rendered
                cy.get("[data-testid='play-pause-button'][aria-label='Play']").should("exist");
            });
        });
    };

    // Take snapshots in modern and bubble layout, outputting log for reference/debugging
    // Player on IRC layout should have the same layout as group layout
    const takeSnapshots = (detail: string) => {
        // Check the status of the seek bar
        // TODO: check if visible - currently visibility check on a narrow timeline causes an error
        cy.get(".mx_AudioPlayer_seek input[type='range']").should("exist");

        // Assert that the pause button is not rendered
        cy.get("[data-testid='play-pause-button'][aria-label='Pause']").should("not.exist");

        // Assert that the play button is rendered
        cy.get("[data-testid='play-pause-button'][aria-label='Play']").should("exist");

        // Enable group layout
        cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Group);

        // 243 + 12px + 12px = 267px
        // See _MediaBody.pcss and _AudioPlayer.pcss for spacing
        cy.get(".mx_MAudioBody").percySnapshotElement(detail + " on group layout", {
            percyCSS,
            widths: [267],
        });

        cy.log("Took a snapshot of " + detail + " on group layout");

        // Enable bubble layout
        cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Bubble);

        // 243px + 12px + 48px = 303px
        // See _EventBubbleTile.pcss and _AudioPlayer.pcss for spacing
        cy.get(".mx_MAudioBody").percySnapshotElement(detail + " on bubble layout", {
            percyCSS,
            widths: [303],
        });

        cy.log("Took a snapshot of " + detail + " on bubble layout");

        // Reset the layout
        cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Group);
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

    it("should render player on every layout", () => {
        visitRoom();

        // Upload one second audio file with a long file name
        uploadFile("cypress/fixtures/1sec-long-name-audio-file.ogg");

        cy.get(".mx_RoomView_MessageList").within(() => {
            checkPlayerFilenameLong();

            // Check audio player on IRC layout here, which currently should be same as on modern layout
            cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.IRC);
            // 243 + 12px + 12px = 267px
            // See _MediaBody.pcss and _AudioPlayer.pcss for spacing
            cy.get(".mx_MAudioBody").percySnapshotElement("Audio player (light theme) on IRC layout", {
                percyCSS,
                widths: [267],
            });
            cy.log("Took a snapshot of Audio player (light theme) on IRC layout");

            // Reset to the default layout
            cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Group);

            // Take snapshots (light theme)
            takeSnapshots("Audio player (light theme)");

            // Take snapshots (light theme, monospace font)
            cy.setSettingValue("useSystemFont", null, SettingLevel.DEVICE, true);
            cy.setSettingValue("systemFont", null, SettingLevel.DEVICE, "monospace");
            // Assert that the monospace timer is visible
            cy.get("[role='timer']").should("have.css", "font-family", '"monospace"').should("be.visible");
            takeSnapshots("Audio player (light theme, monospace)");

            // Reset font setting
            cy.setSettingValue("useSystemFont", null, SettingLevel.DEVICE, false);

            // Take snapshots (dark theme)
            cy.setSettingValue("theme", null, SettingLevel.ACCOUNT, "dark");
            takeSnapshots("Audio player (dark theme)");
        });
    });

    it("should render player on high contrast theme", () => {
        visitRoom();

        // Upload one second audio file with a long file name
        uploadFile("cypress/fixtures/1sec-long-name-audio-file.ogg");

        cy.get(".mx_RoomView_MessageList").within(() => {
            checkPlayerFilenameLong();
        });

        // Enable high contrast manually
        cy.openUserSettings("Appearance");
        cy.get(".mx_UserSettingsDialog").within(() => {
            cy.get(".mx_ThemeChoicePanel").within(() => {
                cy.get("[data-testid='theme-choice-panel-selectors']").within(() => {
                    // Enable light theme
                    cy.get(".mx_ThemeSelector_light").click();
                });

                cy.get("[data-testid='theme-choice-panel-highcontrast']").within(() => {
                    // Click the checkbox
                    cy.get("label .mx_Checkbox_background").click();
                });
            });

            // Close the user settings dialog
            cy.get("[aria-label='Close dialog']").click();
        });

        // Take snapshots (high contrast, light theme only)
        cy.get(".mx_RoomView_MessageList").within(() => {
            takeSnapshots("Audio player (high contrast)");
        });
    });

    it("should play an audio file", () => {
        visitRoom();

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
        visitRoom();

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
        visitRoom();

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
            const takeSnapshotReply = (layout: string) => {
                cy.get(".mx_EventTile_last .mx_MAudioBody").should("be.visible");
                cy.get(".mx_EventTile_last").percySnapshotElement(
                    `"EventTile of audio player with a reply on ${layout} layout"`,
                    { percyCSS },
                );
                cy.log(`""Took a snapshot of EventTile of audio player with a reply on ${layout} layout"`);
            };

            cy.get(".mx_EventTile_last").within(() => {
                // Assert that replied audio file is rendered as file button inside ReplyChain
                cy.get(".mx_ReplyChain_wrapper").within(() => {
                    cy.get(".mx_MFileBody_info[role='button']").within(() => {
                        // Assert that the file button has file name
                        cy.get(".mx_MFileBody_info_filename").should("exist");
                    });
                });

                cy.get(".mx_MAudioBody").within(() => {
                    // Assert that the play button is visible
                    cy.get("[data-testid='play-pause-button'][aria-label='Play']").should("be.visible");
                });
            });

            // Take a snapshot of EventTile with a reply on group layout
            cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Group);
            takeSnapshotReply("group");

            // Take a snapshot of EventTile with a reply on bubble layout
            cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Bubble);
            takeSnapshotReply("bubble");
        });
    });

    it("should create ReplyChain with multiple audio files", () => {
        const clickButtonReply = () => {
            cy.get(".mx_EventTile_last")
                .realHover()
                .within(() => {
                    // Click "Reply" button on MessageActionBar
                    cy.get('[aria-label="Reply"]').click({ force: false });
                });
        };

        visitRoom();

        // Upload one second audio file with a long file name
        uploadFile("cypress/fixtures/1sec-long-name-audio-file.ogg");

        cy.get(".mx_RoomView_MessageList").within(() => {
            // Assert the audio player is rendered
            cy.get(".mx_EventTile_last .mx_AudioPlayer_container").should("exist");

            clickButtonReply();
        });

        // Reply to the player with another audio file
        uploadFile("cypress/fixtures/1sec.ogg");

        cy.get(".mx_RoomView_MessageList").within(() => {
            cy.get(".mx_EventTile_last").within(() => {
                // Assert the audio player is not rendered
                cy.get(".mx_EventTile_last .mx_AudioPlayer_container").should("not.exist");

                // Assert that audio file is rendered as file button
                cy.get(".mx_ReplyChain").within(() => {
                    cy.get(".mx_MFileBody_info[role='button']").within(() => {
                        // Assert that the file button has file name
                        cy.get(".mx_MFileBody_info_filename").should("exist");
                    });
                });
            });

            clickButtonReply();
        });

        // Reply to the player with another audio file
        uploadFile("cypress/fixtures/1sec-long-name-audio-file.ogg");

        cy.get(".mx_RoomView_MessageList").within(() => {
            cy.get(".mx_EventTile_last").within(() => {
                // Assert that there are two "mx_ReplyChain"
                cy.get(".mx_ReplyChain").should("have.length", 2);

                // Assert that one line contains the user name
                cy.contains(".mx_ReplyChain .mx_ReplyTile_sender", TEST_USER);

                // Assert that the other line contains the file button
                cy.get(".mx_ReplyChain .mx_MFileBody").within(() => {
                    // Assert that audio file is rendered as file button
                    cy.get(".mx_MFileBody_info[role='button']").within(() => {
                        // Assert that the file button has file name
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
                        // Assert that the file button contains the name of the file sent at first
                        cy.contains(".mx_MFileBody_info_filename", "1sec-long-name");
                    });
                });
            });
        });

        // Scroll to the bottom to make the audio player visible for Percy tests
        cy.get(".mx_MainSplit .mx_ScrollPanel").scrollTo("bottom");

        cy.get(".mx_RoomView_MessageList").within(() => {
            const takeSnapshotReplyChain = (layout: string) => {
                cy.get(".mx_EventTile_last .mx_ReplyChain").should("be.visible");
                cy.get(".mx_EventTile_last").percySnapshotElement(
                    `"EventTile of audio player with ReplyChain on ${layout} layout"`,
                    { percyCSS },
                );
                cy.log(`"Took a snapshot of EventTile of audio player with ReplyChain on ${layout} layout"`);
            };

            // Take a snapshot of EventTile with ReplyChain on group layout
            cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Group);
            takeSnapshotReplyChain("group");

            // Take a snapshot of EventTile with ReplyChain on bubble layout
            cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Bubble);
            takeSnapshotReplyChain("bubble");
        });
    });
});
