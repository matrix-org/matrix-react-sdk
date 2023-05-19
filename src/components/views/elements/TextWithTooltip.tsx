/*
 Copyright 2019 New Vector Ltd.

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

import React, { HTMLAttributes } from "react";
import classNames from "classnames";
import { randomString } from "matrix-js-sdk/src/randomstring";

import TooltipTarget from "./TooltipTarget";

interface IProps extends HTMLAttributes<HTMLSpanElement> {
    class?: string;
    tooltipClass?: string;
    tooltip: React.ReactNode;
    tooltipProps?: Omit<React.ComponentProps<typeof TooltipTarget>, "label" | "tooltipClassName" | "className">;
    onClick?: (ev: React.MouseEvent) => void;
}

export default class TextWithTooltip extends React.Component<IProps> {
    private id = "mx_TextWithTooltip_" + randomString(8);

    public constructor(props: IProps) {
        super(props);
    }

    public render(): React.ReactNode {
        const { class: className, children, tooltip, tooltipClass, tooltipProps, ...props } = this.props;

        return (
            <TooltipTarget
                id={this.id}
                onClick={this.props.onClick}
                tooltipTargetClassName={classNames("mx_TextWithTooltip_target", className)}
                {...tooltipProps}
                label={tooltip}
                tooltipClassName={tooltipClass}
                className="mx_TextWithTooltip_tooltip"
                {...props}
            >
                {children}
            </TooltipTarget>
        );
    }
}
