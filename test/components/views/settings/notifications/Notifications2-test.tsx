/*
Copyright 2022, 2023 The Matrix.org Foundation C.I.C.

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

import { act, findByRole, fireEvent, queryByRole, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IPushRules, MatrixClient, NotificationCountType, PushRuleKind, Room, RuleId } from "matrix-js-sdk/src/matrix";
import React from "react";
import { ThreepidMedium } from "matrix-js-sdk/src/@types/threepids";

import NotificationSettings2 from "../../../../../src/components/views/settings/notifications/NotificationSettings2";
import MatrixClientContext from "../../../../../src/contexts/MatrixClientContext";
import { MatrixClientPeg } from "../../../../../src/MatrixClientPeg";
import { StandardActions } from "../../../../../src/notifications/StandardActions";
import { mockRandom } from "../../../../predictableRandom";
import { mkMessage, stubClient } from "../../../../test-utils";

mockRandom();

const waitForUpdate = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

describe("<Notifications />", () => {
    let cli: MatrixClient;
    let pushRules: IPushRules;

    beforeAll(async () => {
        pushRules = (await import("../../../../models/notificationsettings/pushrules_sample.json")) as IPushRules;
    });

    beforeEach(() => {
        stubClient();
        cli = MatrixClientPeg.safeGet();
        cli.getPushRules = jest.fn(cli.getPushRules).mockResolvedValue(pushRules);
        cli.supportsIntentionalMentions = jest.fn(cli.supportsIntentionalMentions).mockReturnValue(false);
        cli.setPushRuleEnabled = jest.fn(cli.setPushRuleEnabled);
        cli.setPushRuleActions = jest.fn(cli.setPushRuleActions);
        cli.removePusher = jest.fn(cli.removePusher).mockResolvedValue({});
        cli.setPusher = jest.fn(cli.setPusher).mockResolvedValue({});
    });

    it("matches the snapshot", async () => {
        cli.getPushers = jest.fn(cli.getPushers).mockResolvedValue({
            pushers: [
                {
                    app_display_name: "Element",
                    app_id: "im.vector.app",
                    data: {},
                    device_display_name: "My EyeFon",
                    kind: "http",
                    lang: "en",
                    pushkey: "",
                    enabled: true,
                },
            ],
        });
        cli.getThreePids = jest.fn(cli.getThreePids).mockResolvedValue({
            threepids: [
                {
                    medium: ThreepidMedium.Email,
                    address: "test@example.tld",
                    validated_at: 1656633600,
                    added_at: 1656633600,
                },
            ],
        });

        const screen = render(
            <MatrixClientContext.Provider value={cli}>
                <NotificationSettings2 />
            </MatrixClientContext.Provider>,
        );
        await act(waitForUpdate);
        expect(screen.container).toMatchSnapshot();
    });

    describe("form elements actually toggle the model value", () => {
        it("global mute", async () => {
            const label = "Enable notifications for this account";

            const user = userEvent.setup();
            const screen = render(
                <MatrixClientContext.Provider value={cli}>
                    <NotificationSettings2 />
                </MatrixClientContext.Provider>,
            );
            await act(waitForUpdate);
            expect(screen.getByLabelText(label)).not.toBeDisabled();
            await act(() => user.click(screen.getByLabelText(label)));
            expect(cli.setPushRuleEnabled).toHaveBeenCalledWith("global", PushRuleKind.Override, RuleId.Master, true);
        });

        it("notification level", async () => {
            const label = "All messages";

            const user = userEvent.setup();
            const screen = render(
                <MatrixClientContext.Provider value={cli}>
                    <NotificationSettings2 />
                </MatrixClientContext.Provider>,
            );
            await act(waitForUpdate);
            expect(screen.getByLabelText(label)).not.toBeDisabled();
            await act(() => user.click(screen.getByLabelText(label)));
            expect(cli.setPushRuleEnabled).toHaveBeenCalledWith(
                "global",
                PushRuleKind.Underride,
                RuleId.EncryptedMessage,
                true,
            );
            expect(cli.setPushRuleEnabled).toHaveBeenCalledWith("global", PushRuleKind.Underride, RuleId.Message, true);
        });

        describe("play a sound for", () => {
            it("people", async () => {
                const label = "People";

                const user = userEvent.setup();
                const screen = render(
                    <MatrixClientContext.Provider value={cli}>
                        <NotificationSettings2 />
                    </MatrixClientContext.Provider>,
                );
                await act(waitForUpdate);
                expect(screen.getByLabelText(label)).not.toBeDisabled();
                await act(() => user.click(screen.getByLabelText(label)));
                expect(cli.setPushRuleActions).toHaveBeenCalledWith(
                    "global",
                    PushRuleKind.Underride,
                    RuleId.EncryptedDM,
                    StandardActions.ACTION_NOTIFY_DEFAULT_SOUND,
                );
                expect(cli.setPushRuleActions).toHaveBeenCalledWith(
                    "global",
                    PushRuleKind.Underride,
                    RuleId.DM,
                    StandardActions.ACTION_NOTIFY_DEFAULT_SOUND,
                );
                expect(cli.setPushRuleActions).toHaveBeenCalledWith(
                    "global",
                    PushRuleKind.Override,
                    RuleId.InviteToSelf,
                    StandardActions.ACTION_NOTIFY_DEFAULT_SOUND,
                );
            });

            it("mentions", async () => {
                const label = "Mentions and Keywords";

                const user = userEvent.setup();
                const screen = render(
                    <MatrixClientContext.Provider value={cli}>
                        <NotificationSettings2 />
                    </MatrixClientContext.Provider>,
                );
                await act(waitForUpdate);
                expect(screen.getByLabelText(label)).not.toBeDisabled();
                await act(() => user.click(screen.getByLabelText(label)));
                expect(cli.setPushRuleActions).toHaveBeenCalledWith(
                    "global",
                    PushRuleKind.Override,
                    RuleId.ContainsDisplayName,
                    StandardActions.ACTION_HIGHLIGHT,
                );
                expect(cli.setPushRuleActions).toHaveBeenCalledWith(
                    "global",
                    PushRuleKind.ContentSpecific,
                    RuleId.ContainsUserName,
                    StandardActions.ACTION_HIGHLIGHT,
                );
            });

            it("calls", async () => {
                const label = "Audio and Video calls";

                const user = userEvent.setup();
                const screen = render(
                    <MatrixClientContext.Provider value={cli}>
                        <NotificationSettings2 />
                    </MatrixClientContext.Provider>,
                );
                await act(waitForUpdate);
                expect(screen.getByLabelText(label)).not.toBeDisabled();
                await act(() => user.click(screen.getByLabelText(label)));
                expect(cli.setPushRuleActions).toHaveBeenCalledWith(
                    "global",
                    PushRuleKind.Underride,
                    RuleId.IncomingCall,
                    StandardActions.ACTION_NOTIFY,
                );
            });
        });

        describe("activity", () => {
            it("invite", async () => {
                const label = "Invited to a room";

                const user = userEvent.setup();
                const screen = render(
                    <MatrixClientContext.Provider value={cli}>
                        <NotificationSettings2 />
                    </MatrixClientContext.Provider>,
                );
                await act(waitForUpdate);
                expect(screen.getByLabelText(label)).not.toBeDisabled();
                await act(() => user.click(screen.getByLabelText(label)));
                expect(cli.setPushRuleActions).toHaveBeenCalledWith(
                    "global",
                    PushRuleKind.Override,
                    RuleId.InviteToSelf,
                    StandardActions.ACTION_NOTIFY,
                );
            });
            it("status messages", async () => {
                const label = "New room activity, upgrades and status messages occur";

                const user = userEvent.setup();
                const screen = render(
                    <MatrixClientContext.Provider value={cli}>
                        <NotificationSettings2 />
                    </MatrixClientContext.Provider>,
                );
                await act(waitForUpdate);
                expect(screen.getByLabelText(label)).not.toBeDisabled();
                await act(() => user.click(screen.getByLabelText(label)));
                expect(cli.setPushRuleActions).toHaveBeenCalledWith(
                    "global",
                    PushRuleKind.Override,
                    RuleId.MemberEvent,
                    StandardActions.ACTION_NOTIFY,
                );
                expect(cli.setPushRuleActions).toHaveBeenCalledWith(
                    "global",
                    PushRuleKind.Override,
                    RuleId.Tombstone,
                    StandardActions.ACTION_HIGHLIGHT,
                );
            });
            it("notices", async () => {
                const label = "Messages are sent by a bot";

                const user = userEvent.setup();
                const screen = render(
                    <MatrixClientContext.Provider value={cli}>
                        <NotificationSettings2 />
                    </MatrixClientContext.Provider>,
                );
                await act(waitForUpdate);
                expect(screen.getByLabelText(label)).not.toBeDisabled();
                await act(() => user.click(screen.getByLabelText(label)));
                expect(cli.setPushRuleActions).toHaveBeenCalledWith(
                    "global",
                    PushRuleKind.Override,
                    RuleId.SuppressNotices,
                    StandardActions.ACTION_DONT_NOTIFY,
                );
            });
        });
        describe("mentions", () => {
            it("room mentions", async () => {
                const label = "Notify when someone mentions using @room";

                const user = userEvent.setup();
                const screen = render(
                    <MatrixClientContext.Provider value={cli}>
                        <NotificationSettings2 />
                    </MatrixClientContext.Provider>,
                );
                await act(waitForUpdate);
                expect(screen.getByLabelText(label)).not.toBeDisabled();
                await act(() => user.click(screen.getByLabelText(label)));
                expect(cli.setPushRuleActions).toHaveBeenCalledWith(
                    "global",
                    PushRuleKind.Override,
                    RuleId.AtRoomNotification,
                    StandardActions.ACTION_DONT_NOTIFY,
                );
            });
            it("user mentions", async () => {
                const label = "Notify when someone mentions using @displayname or @mxid";

                const user = userEvent.setup();
                const screen = render(
                    <MatrixClientContext.Provider value={cli}>
                        <NotificationSettings2 />
                    </MatrixClientContext.Provider>,
                );
                await act(waitForUpdate);
                expect(screen.getByLabelText(label)).not.toBeDisabled();
                await act(() => user.click(screen.getByLabelText(label)));
                expect(cli.setPushRuleActions).toHaveBeenCalledWith(
                    "global",
                    PushRuleKind.Override,
                    RuleId.ContainsDisplayName,
                    StandardActions.ACTION_DONT_NOTIFY,
                );
                expect(cli.setPushRuleActions).toHaveBeenCalledWith(
                    "global",
                    PushRuleKind.ContentSpecific,
                    RuleId.ContainsUserName,
                    StandardActions.ACTION_DONT_NOTIFY,
                );
            });
        });
    });

    describe("pusher settings", () => {
        it("can create email pushers", async () => {
            cli.getPushers = jest.fn(cli.getPushers).mockResolvedValue({
                pushers: [
                    {
                        app_display_name: "Element",
                        app_id: "im.vector.app",
                        data: {},
                        device_display_name: "My EyeFon",
                        kind: "http",
                        lang: "en",
                        pushkey: "",
                        enabled: true,
                    },
                ],
            });
            cli.getThreePids = jest.fn(cli.getThreePids).mockResolvedValue({
                threepids: [
                    {
                        medium: ThreepidMedium.Email,
                        address: "test@example.tld",
                        validated_at: 1656633600,
                        added_at: 1656633600,
                    },
                ],
            });

            const label = "test@example.tld";
            const user = userEvent.setup();
            const screen = render(
                <MatrixClientContext.Provider value={cli}>
                    <NotificationSettings2 />
                </MatrixClientContext.Provider>,
            );
            await act(waitForUpdate);
            expect(screen.getByLabelText(label)).not.toBeDisabled();
            await act(() => user.click(screen.getByLabelText(label)));
            expect(cli.setPusher).toHaveBeenCalledWith({
                app_display_name: "Email Notifications",
                app_id: "m.email",
                append: true,
                data: { brand: "Element" },
                device_display_name: "test@example.tld",
                kind: "email",
                lang: "en-US",
                pushkey: "test@example.tld",
            });
        });

        it("can remove email pushers", async () => {
            cli.getPushers = jest.fn(cli.getPushers).mockResolvedValue({
                pushers: [
                    {
                        app_display_name: "Element",
                        app_id: "im.vector.app",
                        data: {},
                        device_display_name: "My EyeFon",
                        kind: "http",
                        lang: "en",
                        pushkey: "abctest",
                    },
                    {
                        app_display_name: "Email Notifications",
                        app_id: "m.email",
                        data: { brand: "Element" },
                        device_display_name: "test@example.tld",
                        kind: "email",
                        lang: "en-US",
                        pushkey: "test@example.tld",
                    },
                ],
            });
            cli.getThreePids = jest.fn(cli.getThreePids).mockResolvedValue({
                threepids: [
                    {
                        medium: ThreepidMedium.Email,
                        address: "test@example.tld",
                        validated_at: 1656633600,
                        added_at: 1656633600,
                    },
                ],
            });

            const label = "test@example.tld";
            const user = userEvent.setup();
            const screen = render(
                <MatrixClientContext.Provider value={cli}>
                    <NotificationSettings2 />
                </MatrixClientContext.Provider>,
            );
            await act(waitForUpdate);
            expect(screen.getByLabelText(label)).not.toBeDisabled();
            await act(() => user.click(screen.getByLabelText(label)));
            expect(cli.removePusher).toHaveBeenCalledWith("test@example.tld", "m.email");
        });
    });

    describe("clear all notifications", () => {
        it("is hidden when no notifications exist", async () => {
            const room = new Room("room123", cli, "@alice:example.org");
            cli.getRooms = jest.fn(cli.getRooms).mockReturnValue([room]);

            const { container } = render(
                <MatrixClientContext.Provider value={cli}>
                    <NotificationSettings2 />
                </MatrixClientContext.Provider>,
            );
            await waitForUpdate();
            expect(
                queryByRole(container, "button", {
                    name: "Mark all messages as read",
                }),
            ).not.toBeInTheDocument();
        });

        it("clears all notifications", async () => {
            const room = new Room("room123", cli, "@alice:example.org");
            cli.getRooms = jest.fn(cli.getRooms).mockReturnValue([room]);

            const message = mkMessage({
                event: true,
                room: "room123",
                user: "@alice:example.org",
                ts: 1,
            });
            room.addLiveEvents([message]);
            room.setUnreadNotificationCount(NotificationCountType.Total, 1);

            const { container } = render(
                <MatrixClientContext.Provider value={cli}>
                    <NotificationSettings2 />
                </MatrixClientContext.Provider>,
            );
            await waitForUpdate();
            const clearNotificationEl = await findByRole(container, "button", {
                name: "Mark all messages as read",
            });

            fireEvent.click(clearNotificationEl);
            expect(cli.sendReadReceipt).toHaveBeenCalled();

            await waitFor(() => {
                expect(clearNotificationEl).not.toBeInTheDocument();
            });
        });
    });
});
