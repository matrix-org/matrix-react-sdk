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

    // Exclude from snapshots
    const percyCSS =
        // FIXME: hide mx_SeekBar because flaky - see https://github.com/vector-im/element-web/issues/24898
        ".mx_SeekBar, " +
        // Hide for screenshot consistency
        ".mx_JumpToBottomButton, " +
        ".mx_MessageTimestamp, .mx_RoomView_myReadMarker { visibility: hidden !important; }";

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

    // Check that the audio player for the long-name-audio-file has been rendered correctly
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
    // We don't test IRC layout, since it should be the same as group layout.
    const takeSnapshots = (wrapper: string, detail: string) => {
        // Check the status of the seek bar
        // TODO: check if visible - currently visibility check on a narrow timeline causes an error
        cy.get(`${wrapper}.mx_AudioPlayer_seek input[type='range']`).should("exist");

        // Assert that the pause button is not rendered
        cy.get(`${wrapper}[data-testid='play-pause-button'][aria-label='Pause']`).should("not.exist");

        // Assert that the play button is rendered
        cy.get(`${wrapper}[data-testid='play-pause-button'][aria-label='Play']`).should("exist");

        // Enable group layout
        cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Group);

        // 243 + 12px + 12px = 267px
        // See _MediaBody.pcss and _AudioPlayer.pcss for spacing
        cy.get(`${wrapper}.mx_MAudioBody`).percySnapshotElement(detail + " on group layout", {
            percyCSS,
            widths: [267],
        });

        cy.log("Took a snapshot of " + detail + " on group layout");

        // Enable bubble layout
        cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Bubble);

        // 243px + 12px + 48px = 303px
        // See _EventBubbleTile.pcss and _AudioPlayer.pcss for spacing
        cy.get(`${wrapper}.mx_MAudioBody`).percySnapshotElement(detail + " on bubble layout", {
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

    it("should be correctly rendered on each layout", () => {
        visitRoom();

        // Upload one second audio file with a long file name
        uploadFile("cypress/fixtures/1sec-long-name-audio-file.ogg");

        // Scroll to the bottom to make the audio player visible for Percy tests
        cy.get(".mx_MainSplit .mx_ScrollPanel").scrollTo("bottom");

        cy.get(".mx_RoomView_MessageList").within(() => {
            checkPlayerFilenameLong();

            // Click the timestamp to highlight the event tile on which player is rendered
            cy.get(".mx_EventTile .mx_MessageTimestamp").click();
            cy.get(".mx_EventTile.mx_EventTile_selected .mx_MAudioBody").should("be.visible");

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
            takeSnapshots("", "Audio player (light theme)");

            // Take snapshots (light theme, monospace font)
            cy.setSettingValue("useSystemFont", null, SettingLevel.DEVICE, true);
            cy.setSettingValue("systemFont", null, SettingLevel.DEVICE, "monospace");
            // Assert that the monospace timer is visible
            cy.get("[role='timer']").should("have.css", "font-family", '"monospace"').should("be.visible");
            takeSnapshots("", "Audio player (light theme, monospace)");

            // Reset font setting
            cy.setSettingValue("useSystemFont", null, SettingLevel.DEVICE, false);

            // Take snapshots (dark theme)
            cy.setSettingValue("theme", null, SettingLevel.ACCOUNT, "dark");
            takeSnapshots("", "Audio player (dark theme)");
        });
    });

    it("should be correctly rendered on high contrast theme", () => {
        visitRoom();

        // Upload one second audio file with a long file name
        uploadFile("cypress/fixtures/1sec-long-name-audio-file.ogg");

        cy.get(".mx_RoomView_MessageList").within(() => {
            checkPlayerFilenameLong();
        });

        // Disable "Match system theme" in case
        cy.setSettingValue("use_system_theme", null, SettingLevel.DEVICE, false);

        // Enable high contrast manually
        cy.openUserSettings("Appearance")
            .get(".mx_ThemeChoicePanel")
            .within(() => {
                cy.get("[data-testid='theme-choice-panel-selectors']").within(() => {
                    // Enable light theme
                    cy.get(".mx_ThemeSelector_light").click();

                    // Assert that the radio button for light theme was checked
                    cy.get(".mx_StyledRadioButton_checked input[value='light']").should("exist");
                });

                cy.get("[data-testid='theme-choice-panel-highcontrast']").within(() => {
                    // Click the checkbox
                    cy.get("label .mx_Checkbox_background").click();
                });
            });

        // Close the user settings dialog
        cy.get("[aria-label='Close dialog']").click();

        // Scroll to the bottom to make the audio player visible for Percy tests
        cy.get(".mx_MainSplit .mx_ScrollPanel").scrollTo("bottom");

        cy.get(".mx_RoomView_MessageList").within(() => {
            // Click the timestamp to highlight the event tile on which player is rendered
            cy.get(".mx_EventTile .mx_MessageTimestamp").click();
            cy.get(".mx_EventTile.mx_EventTile_selected .mx_MAudioBody").should("be.visible");

            // Take snapshots (high contrast, light theme only)
            takeSnapshots("", "Audio player (high contrast)");
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

    it("should support downloading an audio file", () => {
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

    it("should support replying to audio file with another audio file", () => {
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
        });

        // Scroll to the bottom to make the audio player visible for Percy tests
        cy.get(".mx_MainSplit .mx_ScrollPanel").scrollTo("bottom");

        cy.get(".mx_RoomView_MessageList").within(() => {
            const takeSnapshotReply = (layout: string) => {
                // Click the timestamp to highlight the event tile on which player is rendered
                cy.get(".mx_EventTile_last .mx_MessageTimestamp").click();
                cy.get(".mx_EventTile.mx_EventTile_selected .mx_MAudioBody").should("be.visible");

                cy.get(".mx_EventTile_last .mx_MAudioBody").should("be.visible");
                cy.get(".mx_EventTile_last").percySnapshotElement(
                    `EventTile of audio player with a reply on ${layout} layout`,
                    { percyCSS },
                );
                cy.log(`Took a snapshot of EventTile of audio player with a reply on ${layout} layout`);
            };

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
                // Click the timestamp to highlight the event tile on which player is rendered
                cy.get(".mx_EventTile_last .mx_MessageTimestamp").click();
                cy.get(".mx_EventTile.mx_EventTile_selected .mx_MAudioBody").should("be.visible");

                cy.get(".mx_EventTile_last .mx_ReplyChain").should("be.visible");
                cy.get(".mx_EventTile_last").percySnapshotElement(
                    `EventTile of audio player with ReplyChain on ${layout} layout`,
                    { percyCSS },
                );
                cy.log(`Took a snapshot of EventTile of audio player with ReplyChain on ${layout} layout`);
            };

            // Take a snapshot of EventTile with ReplyChain on group layout
            cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Group);
            takeSnapshotReplyChain("group");

            // Take a snapshot of EventTile with ReplyChain on bubble layout
            cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Bubble);
            takeSnapshotReplyChain("bubble");
        });
    });

    it("should render, play, and reply on a thread", () => {
        const takeSnapshotTimeline = (layout: string) => {
            cy.get(".mx_MainSplit .mx_RoomView_body").within(() => {
                // Scroll to the bottom to make the audio player visible for Percy tests
                cy.get(".mx_ScrollPanel").scrollTo("bottom");

                // Click the timestamp to highlight the event tile on which player is rendered
                cy.get(".mx_EventTile_last .mx_MessageTimestamp").click();
                cy.get(".mx_EventTile.mx_EventTile_selected .mx_MAudioBody").should("be.visible");
            });

            cy.get(".mx_MainSplit").percySnapshotElement(`Narrow main timeline with ThreadView on ${layout} layout`, {
                percyCSS,
                widths: [600], // magic number
            });
            cy.log(`Took a snapshot of Narrow main timeline with ThreadView on ${layout} layout`);
        };

        visitRoom();

        // Upload one second audio file with a long file name
        uploadFile("cypress/fixtures/1sec-long-name-audio-file.ogg");

        cy.get(".mx_RoomView_body .mx_RoomView_MessageList").within(() => {
            // Assert the audio player is rendered
            cy.get(".mx_EventTile_last .mx_AudioPlayer_container").should("exist");

            // Click the timestamp to highlight the event tile on which player is rendered
            cy.get(".mx_EventTile_last .mx_MessageTimestamp").click();
            cy.get(".mx_EventTile.mx_EventTile_selected .mx_MAudioBody").should("be.visible");

            cy.get(".mx_EventTile_last")
                .realHover()
                .within(() => {
                    // Click "Reply in thread" button on MessageActionBar
                    cy.get('[aria-label="Reply in thread"]').click({ force: false });
                });
        });

        // Assert that the thread is visible
        cy.get(".mx_ThreadView").should("be.visible");

        // Take a snapshot of narrow main timeline with ThreadPanel opened on group layout
        cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Group);
        takeSnapshotTimeline("group");

        // Take a snapshot of narrow main timeline with ThreadPanel opened on bubble layout
        cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Bubble);
        takeSnapshotTimeline("bubble");

        // Reset to the default layout
        cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Group);

        cy.get(".mx_ThreadView").within(() => {
            // Click the timestamp to highlight the event tile on which player is rendered
            cy.get(".mx_EventTile_last .mx_MessageTimestamp").click();
            cy.get(".mx_EventTile.mx_EventTile_selected .mx_MAudioBody").should("be.visible");
        });

        // Take snapshots of audio player on a thread
        takeSnapshots(".mx_ThreadView ", "Audio player on a thread");

        cy.get(".mx_ThreadView").within(() => {
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
