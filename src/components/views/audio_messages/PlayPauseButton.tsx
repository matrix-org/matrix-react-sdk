/*
Copyright 2021 The Matrix.org Foundation C.I.C.

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

import React, { ReactNode } from "react";
import classNames from "classnames";

import AccessibleTooltipButton from "../elements/AccessibleTooltipButton";
import { _t } from "../../../languageHandler";
import { Playback, PlaybackState } from "../../../audio/Playback";
import { Icon as PlayIcon } from "../../../../res/img/element-icons/play.svg";
import { Icon as PauseIcon } from "../../../../res/img/element-icons/pause.svg";

// omitted props are handled by render function
interface IProps extends Omit<React.ComponentProps<typeof AccessibleTooltipButton>, "title" | "onClick" | "disabled"> {
    // Playback instance to manipulate. Cannot change during the component lifecycle.
    playback: Playback;

    // The playback phase to render. Able to change during the component lifecycle.
    playbackPhase: PlaybackState;
}

/**
 * Displays a play/pause button (activating the play/pause function of the recorder)
 * to be displayed in reference to a recording.
 */
export default class PlayPauseButton extends React.PureComponent<IProps> {
    public constructor(props: IProps) {
        super(props);
    }

    private onClick = (): void => {
        // noinspection JSIgnoredPromiseFromCall
        this.toggleState();
    };

    public async toggleState(): Promise<void> {
        await this.props.playback.toggle();
    }

    public render(): ReactNode {
        const { playback, playbackPhase, ...restProps } = this.props;
        const isPlaying = playback.isPlaying;
        const isDisabled = playbackPhase === PlaybackState.Decoding;
        const classes = classNames("mx_Icon", {
            "mx_Icon--disabled": isDisabled,
        });

        let button;
        if (!isPlaying) {
            button = <PlayIcon className={classNames(classes, "mx_Icon--play")} />;
        } else if (isPlaying) {
            button = <PauseIcon className={classNames(classes, "mx_Icon--pause")} />;
        }

        return (
            <AccessibleTooltipButton
                data-testid="play-pause-button"
                className="mx_PlayPauseButton"
                title={isPlaying ? _t("Pause") : _t("Play")}
                onClick={this.onClick}
                disabled={isDisabled}
                {...restProps}
            >
                {button}
            </AccessibleTooltipButton>
        );
    }
}
