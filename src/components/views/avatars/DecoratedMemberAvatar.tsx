/*
Copyright 2020 The Matrix.org Foundation C.I.C.
Copyright 2021 Šimon Brandner <simon.bra.ag@gmail.com>

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

import React from "react";
import classNames from "classnames";
import { User, UserEvent } from "matrix-js-sdk/src/models/user";

import { _t } from "../../../languageHandler";
import TextWithTooltip from "../elements/TextWithTooltip";
import { replaceableComponent } from "../../../utils/replaceableComponent";
import MemberAvatar from "./MemberAvatar";
import { isPresenceEnabled } from "../../../utils/presence";
import MatrixClientContext from "../../../contexts/MatrixClientContext";

interface IProps extends React.ComponentProps<typeof MemberAvatar> {}

interface IState {
    icon: Icon;
}

enum Icon {
    // Note: the names here are used in CSS class names
    None = "NONE", // ... except this one
    PresenceOnline = "ONLINE",
    PresenceAway = "AWAY",
    PresenceOffline = "OFFLINE",
}

function tooltipText(variant: Icon) {
    switch (variant) {
        case Icon.PresenceOnline:
            return _t("Online");
        case Icon.PresenceAway:
            return _t("Away");
        case Icon.PresenceOffline:
            return _t("Offline");
    }
}

@replaceableComponent("views.avatars.DecoratedRoomAvatar")
export default class DecoratedRoomAvatar extends React.PureComponent<IProps, IState> {
    private _dmUser: User;
    static contextType = MatrixClientContext;
    public context!: React.ContextType<typeof MatrixClientContext>;

    constructor(props: IProps, context: React.ContextType<typeof MatrixClientContext>) {
        super(props);

        if (isPresenceEnabled()) {
            this.dmUser = context.getUser(this.props.member.userId);
        }

        this.state = {
            icon: this.getPresenceIcon(),
        };
    }

    public componentWillUnmount(): void {
        this.dmUser = null; // clear listeners, if any
    }

    private get dmUser(): User {
        return this._dmUser;
    }

    private set dmUser(newUser: User) {
        const oldUser = this._dmUser;
        this._dmUser = newUser;

        if (oldUser && oldUser !== newUser) {
            oldUser.off(UserEvent.CurrentlyActive, this.onPresenceUpdate);
            oldUser.off(UserEvent.Presence, this.onPresenceUpdate);
        }
        if (newUser && newUser !== oldUser) {
            newUser.on(UserEvent.CurrentlyActive, this.onPresenceUpdate);
            newUser.on(UserEvent.Presence, this.onPresenceUpdate);
        }
    }

    private onPresenceUpdate = (): void => {
        this.setState({ icon: this.getPresenceIcon() });
    };

    private getPresenceIcon(): Icon {
        if (!this.dmUser) return Icon.None;

        let icon;
        if (this.dmUser.currentlyActive || this.dmUser.presence === 'online') {
            icon = Icon.PresenceOnline;
        } else if (this.dmUser.presence === 'offline') {
            icon = Icon.PresenceOffline;
        } else if (this.dmUser.presence === 'unavailable') {
            icon = Icon.PresenceAway;
        }

        return icon ?? Icon.None;
    }

    public render(): JSX.Element {
        let icon;
        if (this.state.icon !== Icon.None) {
            icon = <TextWithTooltip
                tooltip={tooltipText(this.state.icon)}
                class={`mx_DecoratedAvatar_icon mx_DecoratedAvatar_icon_${this.state.icon.toLowerCase()}`}
            />;
        }

        const classes = classNames("mx_DecoratedAvatar", {
            mx_DecoratedAvatar_cutout: icon,
        });

        return (
            <div className={classes}>
                <MemberAvatar {...this.props} />
                { icon }
            </div>
        );
    }
}
