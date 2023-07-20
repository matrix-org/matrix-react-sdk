/*
Copyright 2018 New Vector Ltd
Copyright 2019 The Matrix.org Foundation C.I.C.

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
import { NumberSize, Resizable } from "re-resizable";
import { Direction } from "re-resizable/lib/resizer";

import ResizeNotifier from "../../utils/ResizeNotifier";

interface IProps {
    resizeNotifier: ResizeNotifier;
    collapsedRhs?: boolean;
    panel?: JSX.Element;
    children: ReactNode;
    /**
     * A unique identifier for this panel split.
     *
     * This is appended to the key used to store the panel size in localStorage, allowing the widths of different
     * panels to be stored.
     */
    sizeKey?: string;
    /**
     * The size to use for the panel component if one isn't persisted in storage. Defaults to 350.
     */
    defaultSize: number;
}

export default class MainSplit extends React.Component<IProps> {
    public static defaultProps = {
        defaultSize: 350,
    };

    private onResizeStart = (): void => {
        this.props.resizeNotifier.startResizing();
    };

    private onResize = (): void => {
        this.props.resizeNotifier.notifyRightHandleResized();
    };

    private get sizeSettingStorageKey(): string {
        let key = "mx_rhs_size";
        if (!!this.props.sizeKey) {
            key += `_${this.props.sizeKey}`;
        }
        return key;
    }

    private onResizeStop = (
        event: MouseEvent | TouchEvent,
        direction: Direction,
        elementRef: HTMLElement,
        delta: NumberSize,
    ): void => {
        this.props.resizeNotifier.stopResizing();
        window.localStorage.setItem(
            this.sizeSettingStorageKey,
            (this.loadSidePanelSize().width + delta.width).toString(),
        );
    };

    private loadSidePanelSize(): { height: string | number; width: number } {
        let rhsSize = parseInt(window.localStorage.getItem(this.sizeSettingStorageKey)!, 10);

        if (isNaN(rhsSize)) {
            rhsSize = this.props.defaultSize;
        }

        return {
            height: "100%",
            width: rhsSize,
        };
    }

    public render(): React.ReactNode {
        const bodyView = React.Children.only(this.props.children);
        const panelView = this.props.panel;

        const hasResizer = !this.props.collapsedRhs && panelView;

        let children;
        if (hasResizer) {
            children = (
                <Resizable
                    key={this.props.sizeKey}
                    defaultSize={this.loadSidePanelSize()}
                    minWidth={264}
                    maxWidth="50%"
                    enable={{
                        top: false,
                        right: false,
                        bottom: false,
                        left: true,
                        topRight: false,
                        bottomRight: false,
                        bottomLeft: false,
                        topLeft: false,
                    }}
                    onResizeStart={this.onResizeStart}
                    onResize={this.onResize}
                    onResizeStop={this.onResizeStop}
                    className="mx_RightPanel_ResizeWrapper"
                    handleClasses={{ left: "mx_ResizeHandle--horizontal" }}
                >
                    {panelView}
                </Resizable>
            );
        }

        return (
            <div className="mx_MainSplit">
                {bodyView}
                {children}
            </div>
        );
    }
}
