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

    const percyCSS =
        // FIXME: hide mx_SeekBar because flaky - see https://github.com/vector-im/element-web/issues/24898
        ".mx_SeekBar, " +
        // Exclude various components from the snapshot, for consistency
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

    // Check that the audio player is rendered and its button becomes visible
    const checkPlayerVisibility = () => {
        // Assert that the player is visible
        cy.get(".mx_MAudioBody").should("be.visible");

        // Assert that rendering of it settled and the play button is visible
        cy.get(".mx_MAudioBody [data-testid='play-pause-button'][aria-label='Play']").should("be.visible");
    };

    /**
     * Define snapshot widths for various scenarios.
     *
     * 267: 243px + 12px + 12px = 267px. Refer _MediaBody.pcss and _AudioPlayer.pcss
     * 133: 267px / 2 = 133.5px
     * 303: 243px + 12px + 48px = 303px. Refer _EventBubbleTile.pcss and _AudioPlayer.pcss
     * 151: 303px / 2 = 151.5px
     * 1024 and 1920: default values specified on .percy.yml
     */
    const snapshotWidthsGroup = [133, 267];
    const snapshotWidthsIRC = snapshotWidthsGroup;
    const snapshotWidthsBubble = [151, 303];
    const snapshotWidthsEventTile = [133, 151, 267, 303, 1024, 1920];

    /**
     * Take snapshots on modern and bubble layouts, outputting log for reference/debugging.
     * Note that this does not take snapshot of players on IRC layout to keep the number of
     * snapshots as low as possible (it should normally be the same as modern layout).
     * @param detail The Percy snapshot name. Used for outputting logs too.
     */
    const takeSnapshots = (detail: string) => {
        // Check the status of the seek bar
        // TODO: check if visible - currently checking its visibility on a compressed EventTile returns an error
        cy.get(".mx_AudioPlayer_seek input[type='range']").should("exist");

        // Enable group layout
        cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Group);

        // click the event timestamp to highlight the event tile in case it is not visible
        cy.get(".mx_EventTile_last[data-layout='group'] .mx_MessageTimestamp").click();

        // Assert that rendering of the player settled and the play button is visible before taking a snapshot
        checkPlayerVisibility();

        // Take a snapshot on group layout
        cy.get(".mx_MAudioBody").percySnapshotElement(detail + " on group layout", {
            percyCSS,
            widths: snapshotWidthsGroup,
        });

        cy.log("Took a snapshot of " + detail + " on group layout");

        // Enable bubble layout
        cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Bubble);

        // click the event timestamp to highlight the event tile in case it is not visible after changing the layout
        cy.get(".mx_EventTile_last[data-layout='bubble'] .mx_MessageTimestamp").click();

        checkPlayerVisibility();

        // Take a snapshot on bubble layout
        cy.get(".mx_MAudioBody").percySnapshotElement(detail + " on bubble layout", {
            percyCSS,
            widths: snapshotWidthsBubble,
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

    it("should be correctly rendered on IRC layout", () => {
        // We cannot use takeSnapshots() here since it does not take snapshots on IRC layout.
        // The design of the player on IRC layout should be same as on modern layout.

        visitRoom();

        // Upload one second audio file with a long file name
        uploadFile("cypress/fixtures/1sec-long-name-audio-file.ogg");

        // Scroll to the bottom to make the audio player visible for Percy tests
        cy.get(".mx_MainSplit .mx_ScrollPanel").scrollTo("bottom");

        cy.get(".mx_RoomView_MessageList").within(() => {
            checkPlayerFilenameLong();

            // Enable IRC layout
            cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.IRC);

            // click the event timestamp to highlight the event tile in case it is not visible
            cy.get(".mx_EventTile_last[data-layout='irc'] .mx_MessageTimestamp").click();

            // Assert that rendering of the player settled and the play button is visible before taking a snapshot
            cy.get(".mx_MAudioBody [data-testid='play-pause-button'][aria-label='Play']").should("be.visible");

            cy.get(".mx_MAudioBody").percySnapshotElement("Audio player (light theme) on IRC layout", {
                percyCSS,
                widths: snapshotWidthsIRC,
            });

            // Output a log for reference/debugging
            cy.log("Took a snapshot of Audio player (light theme) on IRC layout");
        });
    });

    it("should be correctly rendered on modern and bubble layouts", () => {
        visitRoom();

        // Upload one second audio file with a long file name
        uploadFile("cypress/fixtures/1sec-long-name-audio-file.ogg");

        // Scroll to the bottom to make the audio player visible for Percy tests
        cy.get(".mx_MainSplit .mx_ScrollPanel").scrollTo("bottom");

        cy.get(".mx_RoomView_MessageList").within(() => {
            checkPlayerFilenameLong();

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

    it("should be correctly rendered on high contrast theme", () => {
        visitRoom();

        // Upload one second audio file with a long file name
        uploadFile("cypress/fixtures/1sec-long-name-audio-file.ogg");

        cy.get(".mx_RoomView_MessageList").within(() => {
            checkPlayerFilenameLong();
        });

        // Disable system theme (enabled by default) so that high contrast theme can be enabled
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

        cy.closeDialog();

        // Scroll to the bottom to make the audio player visible for Percy tests
        cy.get(".mx_MainSplit .mx_ScrollPanel").scrollTo("bottom");

        cy.get(".mx_RoomView_MessageList").within(() => {
            // click the event timestamp to highlight the event tile on which player is rendered
            cy.get(".mx_EventTile_last .mx_MessageTimestamp").click();

            // Take snapshots (high contrast, light theme only)
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

    it("should support downloading an audio file", () => {
        visitRoom();

        // Upload an audio file
        uploadFile("cypress/fixtures/1sec.ogg");

        cy.get(".mx_RoomView_MessageList").within(() => {
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
                // click the event timestamp to highlight the event tile on which player is rendered
                cy.get(".mx_EventTile_last .mx_MessageTimestamp").click();

                cy.get(".mx_EventTile_last.mx_EventTile_selected").within(() => {
                    checkPlayerVisibility();
                });

                cy.get(".mx_EventTile_last").percySnapshotElement(
                    `Selected EventTile of audio player with a reply on ${layout} layout`,
                    {
                        percyCSS,
                        widths: snapshotWidthsEventTile,
                    },
                );
                cy.log(`Took a snapshot of selected EventTile of audio player with a reply on ${layout} layout`);
            };

            // Take a snapshot of EventTile with a reply on group layout
            cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Group);
            takeSnapshotReply("group");

            // Take a snapshot of EventTile with a reply on bubble layout
            cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Bubble);
            takeSnapshotReply("bubble");
        });
    });

    it("should support creating a reply chain with multiple audio files", () => {
        // Note: "mx_ReplyChain" element is used not only for replies which
        // create a reply chain, but also for a single reply without a replied
        // message. This test checks whether a reply chain which consists of
        // multiple audio file replies is rendered properly.

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
                // Assert that there are two "mx_ReplyChain" elements
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
                // click the event timestamp to highlight the event tile on which player is rendered
                cy.get(".mx_EventTile_last .mx_MessageTimestamp").click();

                cy.get(".mx_EventTile_last.mx_EventTile_selected").within(() => {
                    checkPlayerVisibility();
                });

                cy.get(".mx_EventTile_last .mx_ReplyChain").should("be.visible");
                cy.get(".mx_EventTile_last").percySnapshotElement(
                    `Selected EventTile of audio player with ReplyChain on ${layout} layout`,
                    {
                        percyCSS,
                        widths: snapshotWidthsEventTile,
                    },
                );
                cy.log(`Took a snapshot of selected EventTile of audio player with ReplyChain on ${layout} layout`);
            };

            // Take a snapshot of EventTile with ReplyChain on group layout
            cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Group);
            takeSnapshotReplyChain("group");

            // Take a snapshot of EventTile with ReplyChain on bubble layout
            cy.setSettingValue("layout", null, SettingLevel.DEVICE, Layout.Bubble);
            takeSnapshotReplyChain("bubble");
        });
    });

    it("should be rendered, play, and support replying on a thread", () => {
        visitRoom();

        // Upload one second audio file with a long file name
        uploadFile("cypress/fixtures/1sec-long-name-audio-file.ogg");

        cy.get(".mx_RoomView_MessageList").within(() => {
            // Assert the audio player is rendered
            cy.get(".mx_EventTile_last .mx_AudioPlayer_container").should("exist");

            cy.get(".mx_EventTile_last")
                .realHover()
                .within(() => {
                    // Click "Reply in thread" button on MessageActionBar
                    cy.get('[aria-label="Reply in thread"]').click({ force: false });
                });
        });

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
