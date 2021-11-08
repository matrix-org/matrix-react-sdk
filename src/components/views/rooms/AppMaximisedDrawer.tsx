/*
Copyright 2017 Vector Creations Ltd
Copyright 2018 New Vector Ltd

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

import React from 'react';

import AppTile from '../elements/AppTile';
import dis from '../../../dispatcher/dispatcher';
import * as sdk from '../../../index';
import * as ScalarMessaging from '../../../ScalarMessaging';
import WidgetUtils from '../../../utils/WidgetUtils';
import WidgetEchoStore from "../../../stores/WidgetEchoStore";
import ResizeNotifier from "../../../utils/ResizeNotifier";
import { Container, WidgetLayoutStore } from "../../../stores/widgets/WidgetLayoutStore";
import { replaceableComponent } from "../../../utils/replaceableComponent";
import { Room } from "matrix-js-sdk/src/models/room";
import { IApp } from "../../../stores/WidgetStore";

interface IProps {
    userId: string;
    room: Room;
    resizeNotifier: ResizeNotifier;
    showApps?: boolean; // Should apps be rendered
    maxHeight: number;
}

interface IState {
    app: IApp;
    resizing: boolean;
}

@replaceableComponent("views.rooms.AppMaximisedDrawer")
export default class AppMaximisedDrawer extends React.Component<IProps, IState> {
    private dispatcherRef: string;
    public static defaultProps: Partial<IProps> = {
        showApps: true,
    };

    constructor(props: IProps) {
        super(props);

        this.state = {
            app: this.getApp(),
            resizing: false,
        };

        this.props.resizeNotifier.on("isResizing", this.onIsResizing);
    }

    public componentDidMount(): void {
        ScalarMessaging.startListening();
        WidgetLayoutStore.instance.on(WidgetLayoutStore.emissionForRoom(this.props.room), this.updateApps);
    }

    public componentWillUnmount(): void {
        ScalarMessaging.stopListening();
        WidgetLayoutStore.instance.off(WidgetLayoutStore.emissionForRoom(this.props.room), this.updateApps);
        if (this.dispatcherRef) dis.unregister(this.dispatcherRef);
        this.props.resizeNotifier.off("isResizing", this.onIsResizing);
    }

    private onIsResizing = (resizing: boolean): void => {
        // This inoformation is needed to make sure the widget does not consume the pointer events for resizing.
        this.setState({ resizing: resizing });
    };

    public componentDidUpdate(prevProps: IProps, prevState: IState): void {
        if (prevProps.userId !== this.props.userId || prevProps.room !== this.props.room) {
            // Room has changed, update app
            this.updateApps();
        }
    }

    private getApp = (): IApp => {
        if (WidgetLayoutStore.instance.hasMaximisedWidget(this.props.room)) {
            return WidgetLayoutStore.instance.getContainerWidgets(this.props.room, Container.Center)[0];
        } else {
            console.error("Maximised widget container is shown although there is no app in the center container");
            return undefined;
        }
    };

    private updateApps = (): void => {
        this.setState({
            app: this.getApp(),
        });
    };

    public render(): JSX.Element {
        // Should the showApps button also impct the maximied widget? TODO-maximise_widget Remove after review
        // if (!this.props.showApps) return <div />;

        const app = <AppTile
            key={this.state.app.id}
            app={this.state.app}
            fullWidth={true}
            room={this.props.room}
            userId={this.props.userId}
            creatorUserId={this.state.app.creatorUserId}
            widgetPageTitle={WidgetUtils.getWidgetDataTitle(this.state.app)}
            waitForIframeLoad={this.state.app.waitForIframeLoad}
            pointerEvents={this.state.resizing ? 'none' : undefined}
        />;

        if (!app) {
            return <div />;
        }

        let spinner;
        if (
            !app && WidgetEchoStore.roomHasPendingWidgets(
                this.props.room.roomId,
                WidgetUtils.getRoomWidgets(this.props.room),
            )
        ) {
            const Loader = sdk.getComponent("elements.Spinner");
            spinner = <Loader />;
        }
        return (
            <React.Fragment>
                <div className="mx_AppMaximisedContainer">
                    <React.Fragment key={app.key}>
                        { app }
                    </React.Fragment>
                </div>
                { spinner }
            </React.Fragment>
        );
    }
}
