/*
Copyright 2015, 2016 OpenMarket Ltd
Copyright 2017 New Vector Ltd

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
import { _t } from '../../../languageHandler';
import Widgets from '../../../utils/widgets';
import AppTile from '../elements/AppTile';
import PersistentContextualMenu from '../../structures/PersistentContextualMenu';
import MatrixClientPeg from '../../../MatrixClientPeg';
import Modal from '../../../Modal';
import TintableSvg from '../elements/TintableSvg';
import sdk from '../../../index';
import SdkConfig from '../../../SdkConfig';
import ScalarAuthClient from '../../../ScalarAuthClient';
import dis from '../../../dispatcher';

const widgetType = 'm.stickerpicker';

export default class Stickerpicker extends React.Component {
    constructor(props) {
        super(props);

        this._onStickersMenuShouldHide = this._onStickersMenuShouldHide.bind(this);
        this._launchManageIntegrations = this._launchManageIntegrations.bind(this);
        this._removeStickerpickerWidgets = this._removeStickerpickerWidgets.bind(this);
        this._onWidgetAction = this._onWidgetAction.bind(this);
        this.onShowStickersClick = this.onShowStickersClick.bind(this);
        this.onHideStickersClick = this.onHideStickersClick.bind(this);

        this.defaultStickersContent = (
            <div className='mx_Stickers_contentPlaceholder'>
                <p>{ _t("You don't currently have any stickerpacks enabled") }</p>
                <p>{ _t("Click") } <span className='mx_Stickers_addLink' onClick={this._launchManageIntegrations} > { _t("here") }</span> { _t("to add some!") }</p>
                <img src='img/stickerpack-placeholder.png' alt={_t('Add a stickerpack')} />
            </div>
        );

        this.popoverWidth = 300;
        this.popoverHeight = 300;

        this.state = {
            stickersContent: this.defaultStickersContent,
            showStickers: false,
            imError: null,
        };
    }

    _removeStickerpickerWidgets() {
        console.warn('Removing Stickerpicker widgets');
        if (this.widgetId) {
            this.scalarClient.disableWidgetAssets(widgetType, this.widgetId).then(() => {
                console.warn('Assets disabled');
            }).catch((err) => {
                console.error('Failed to disable assets');
            });
        } else {
            console.warn('No widget ID specified, not disabling assets');
        }
        Widgets.removeStickerpickerWidgets();
        this._getStickerPickerWidget();
        setTimeout(() => this.setState({showStickers: false}));
    }

    componentDidMount() {
        this.scalarClient = null;

        if (SdkConfig.get().integrations_ui_url && SdkConfig.get().integrations_rest_url) {
            this.scalarClient = new ScalarAuthClient();
            this.scalarClient.connect().then(() => {
                this._getStickerPickerWidget().then(() => {
                    this.dispatcherRef = dis.register(this._onWidgetAction);
                });
                this.forceUpdate();
            }).catch((e) => {
                this._imError("Failed to connect to integrations server", e);
            });
        }
    }

    componentWillUnmount() {
        if (this.dispatcherRef) {
            dis.unregister(this.dispatcherRef);
        }
    }

    _imError(errorMsg, e) {
        console.error(errorMsg, e);
        const imErrorContent = <div style={{"text-align": "center"}} className="error"><p> { errorMsg } </p></div>;
        this.setState({
            showStickers: false,
            imError: errorMsg,
            stickersContent: imErrorContent,
        });
    }

    _onWidgetAction(payload) {
        if (payload.action === "user_widget_updated") {
            this._getStickerPickerWidget();
            return;
        } else if (payload.action === "stickerpicker_close") {
          setTimeout(() => this.setState({showStickers: false}));
        }
    }

    _getStickerPickerWidget() {
        return new Promise((resolve, reject) => {
            // Stickers
            // TODO - Add support for Stickerpickers from multiple app stores.
            // Render content from multiple stickerpack sources, each within their own iframe, within the stickerpicker UI element.
            const stickerpickerWidget = Widgets.getStickerpickerWidgets()[0];
            let stickersContent;

            // Load stickerpack content
            if (stickerpickerWidget && stickerpickerWidget.content && stickerpickerWidget.content.url) {
                // Set default name
                stickerpickerWidget.content.name = stickerpickerWidget.name || "Stickerpack";
                this.widgetId = stickerpickerWidget.id;

                stickersContent = (
                    <div
                        style={{
                            overflow: 'hidden',
                            height: '300px',
                        }}
                    >
                        <div
                            id='stickersContent'
                            className='mx_Stickers_content'
                            style={{
                                border: 'none',
                                height: this.popoverHeight,
                                width: this.popoverWidth,
                            }}
                        >
                            <AppTile
                                id={stickerpickerWidget.id}
                                url={stickerpickerWidget.content.url}
                                name={stickerpickerWidget.content.name}
                                room={this.props.room}
                                type={stickerpickerWidget.content.type}
                                fullWidth={true}
                                userId={stickerpickerWidget.sender || MatrixClientPeg.get().credentials.userId}
                                creatorUserId={MatrixClientPeg.get().credentials.userId}
                                waitForIframeLoad={true}
                                show={true}
                                showMenubar={true}
                                onEditClick={this._launchManageIntegrations}
                                onDeleteClick={this._removeStickerpickerWidgets}
                                showTitle={false}
                                showMinimise={true}
                                showDelete={false}
                                onMinimiseClick={this.onHideStickersClick}
                                handleMinimisePointerEvents={true}
                                whitelistCapabilities={['m.sticker']}
                            />
                        </div>
                    </div>
                );
            } else {
                // Default content to show if stickerpicker widget not added
                console.warn("No available sticker picker widgets");
                stickersContent = this.defaultStickersContent;
                this.widgetId = null;
                this.forceUpdate();
            }
            this.setState({
                showStickers: false,
                stickersContent: stickersContent,
            }, resolve());
        });
    }

    /**
     * Show the sticker picker overlay
     * If no stickerpacks have been added, show a link to the integration manager add sticker packs page.
     * @param  {Event} e Event that triggered the function
     */
    onShowStickersClick(e) {
        console.warn('Showing sticker menu', this);
        this.setState({showStickers: true});
    }

    /**
     * Trigger hiding of the sticker picker overlay
     * @param  {Event} ev Event that triggered the function call
     */
    onHideStickersClick(ev) {
        this._onStickersMenuShouldHide();
    }

    /**
     * The stickerpicker should hide
     */
    _onStickersMenuShouldHide() {
        console.warn('Hiding sticker menu', this);
        this.setState({showStickers: false});
    }

    /**
     * Launch the integrations manager on the stickers integration page
     */
    _launchManageIntegrations() {
        const IntegrationsManager = sdk.getComponent("views.settings.IntegrationsManager");
        const src = (this.scalarClient !== null && this.scalarClient.hasCredentials()) ?
                this.scalarClient.getScalarInterfaceUrlForRoom(
                    this.props.room,
                    'type_' + widgetType,
                    this.widgetId,
                ) :
                null;
        Modal.createTrackedDialog('Integrations Manager', '', IntegrationsManager, {
            src: src,
        }, "mx_IntegrationsManager");

        // Wrap this in a timeout in order to avoid the DOM node from being
        // pulled from under its feet
        setTimeout(() => this.setState({showStickers: false}));
    }

    render() {
        let stickersButton = null;

        // Sticker buttons
        if (this.state.showStickers) {
            // Show hide-stickers button
            stickersButton =
                <div
                    id='stickersButton'
                    key="controls_hide_stickers"
                    className="mx_MessageComposer_stickers mx_Stickers_hideStickers"
                    onClick={this.onHideStickersClick}
                    ref='stickersButton'
                    title={_t("Hide Stickers")}
                >
                    <TintableSvg src="img/icons-hide-stickers.svg" width="35" height="35" />
                </div>;
        } else {
            // Show show-stickers button
            stickersButton =
                <div
                    id='stickersButton'
                    key="constrols_show_stickers"
                    className="mx_MessageComposer_stickers"
                    onClick={this.onShowStickersClick}
                    title={_t("Show Stickers")}
                    ref='stickersButton'
                >
                    <TintableSvg src="img/icons-show-stickers.svg" width="35" height="35" />
                </div>;
        }

        const stickersMenu = '';
        // const stickersMenu = <PersistentContextualMenu
        //     chevronOffset={10}
        //     chevronFace={'bottom'}
        //     left={0}
        //     top={0}
        //     menuWidth={this.popoverWidth}
        //     menuHeight={this.popoverHeight}
        //     menuPaddingTop={0}
        //     onMenuShouldHide={this._onStickersMenuShouldHide}
        //     visible={this.state.showStickers}
        // >{ this.state.stickersContent }</PersistentContextualMenu>;

        return (
            <div>
                { stickersButton }
                { stickersMenu }
            </div>
        );
    }
}
