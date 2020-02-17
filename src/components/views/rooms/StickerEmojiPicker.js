/*
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
import {_t, _td} from '../../../languageHandler';
import AppTile from '../elements/AppTile';
import {MatrixClientPeg} from '../../../MatrixClientPeg';
import * as sdk from '../../../index';
import dis from '../../../dispatcher';
import AccessibleButton from '../elements/AccessibleButton';
import WidgetUtils from '../../../utils/WidgetUtils';
import ActiveWidgetStore from '../../../stores/ActiveWidgetStore';
import PersistedElement from "../elements/PersistedElement";
import {IntegrationManagers} from "../../../integrations/IntegrationManagers";
import SettingsStore from "../../../settings/SettingsStore";
import {ContextMenu} from "../../structures/ContextMenu";
import EmojiPicker from "../emojipicker/EmojiPicker";

const widgetType = 'm.stickerpicker';

// This should be below the dialog level (4000), but above the rest of the UI (1000-2000).
// We sit in a context menu, so this should be given to the context menu.
const STICKERPICKER_Z_INDEX = 3500;

// Key to store the widget's AppTile under in PersistedElement
const PERSISTED_ELEMENT_KEY = "stickerEmojiPicker";

export default class StickerEmojiPicker extends React.Component {
    static currentWidget;

    constructor(props) {
        super(props);

        this._onShowStickersClick = this._onShowStickersClick.bind(this);
        this._onHideStickersClick = this._onHideStickersClick.bind(this);
        this._launchManageIntegrations = this._launchManageIntegrations.bind(this);
        this._removeStickerEmojiPickerWidgets = this._removeStickerEmojiPickerWidgets.bind(this);
        this._updateWidget = this._updateWidget.bind(this);
        this._onWidgetAction = this._onWidgetAction.bind(this);
        this._onResize = this._onResize.bind(this);
        this._onFinished = this._onFinished.bind(this);

        this._onEmojiClick = this._onEmojiClick.bind(this);
        this._onTabSwitch = this._onTabSwitch.bind(this);

        this.popoverWidth = 340;
        this.popoverHeight = 488;

        // This is loaded by _acquireScalarClient on an as-needed basis.
        this.scalarClient = null;

        this.state = {
            showStickers: false,
            imError: null,
            stickerpickerX: null,
            stickerpickerY: null,
            stickerpickerWidget: null,
            widgetId: null,
            selectedEmojis: new Set(Object.keys(this.getEmojis())),
            showEmojisTab: true,
            showStickersTab: false
        };

        this._editorRef = null;
    }

    getEmojis() {
        return {};

        /*
        const userId = MatrixClientPeg.get().getUserId();
        const myAnnotations = this.props.reactions.getAnnotationsBySender()[userId] || [];

        return Object.fromEntries([...myAnnotations]
            .filter(event => !event.isRedacted())
            .map(event => [event.getRelation().key, event.getId()]));
        */
    }

    _onEmojiClick(emoji) {
        dis.dispatch({
            action: 'insert_emoji',
            emoji: emoji
        });
    }

    _onTabSwitch() {
        if (this.state.showEmojisTab === true) {
            this.setState({
                showEmojisTab: false,
                showStickersTab: true
            });
        } else {
            this.setState({
                showEmojisTab: true,
                showStickersTab: false
            });
        }
    }

    _acquireScalarClient() {
        if (this.scalarClient) return Promise.resolve(this.scalarClient);
        // TODO: Pick the right manager for the widget
        if (IntegrationManagers.sharedInstance().hasManager()) {
            this.scalarClient = IntegrationManagers.sharedInstance().getPrimaryManager().getScalarClient();
            return this.scalarClient.connect().then(() => {
                this.forceUpdate();
                return this.scalarClient;
            }).catch((e) => {
                this._imError(_td("Failed to connect to integration manager"), e);
            });
        } else {
            IntegrationManagers.sharedInstance().openNoManagerDialog();
        }
    }

    async _removeStickerEmojiPickerWidgets() {
        const scalarClient = await this._acquireScalarClient();
        console.warn('Removing StickerEmojiPicker widgets');
        if (this.state.widgetId) {
            if (scalarClient) {
                scalarClient.disableWidgetAssets(widgetType, this.state.widgetId).then(() => {
                    console.warn('Assets disabled');
                }).catch((err) => {
                    console.error('Failed to disable assets');
                });
            } else {
                console.error("Cannot disable assets: no scalar client");
            }
        } else {
            console.warn('No widget ID specified, not disabling assets');
        }

        this.setState({showStickers: false});
        WidgetUtils.removeStickerEmojiPickerWidgets().then(() => {
            this.forceUpdate();
        }).catch((e) => {
            console.error('Failed to remove sticker picker widget', e);
        });
    }

    componentDidMount() {
        // Close the sticker picker when the window resizes
        window.addEventListener('resize', this._onResize);

        this.dispatcherRef = dis.register(this._onWidgetAction);

        // Track updates to widget state in account data
        MatrixClientPeg.get().on('accountData', this._updateWidget);

        // Initialise widget state from current account data
        this._updateWidget();
    }

    componentWillUnmount() {
        const client = MatrixClientPeg.get();
        if (client) client.removeListener('accountData', this._updateWidget);

        window.removeEventListener('resize', this._onResize);
        if (this.dispatcherRef) {
            dis.unregister(this.dispatcherRef);
        }
    }

    componentDidUpdate(prevProps, prevState) {
        this._sendVisibilityToWidget(this.state.showStickers);
    }

    _imError(errorMsg, e) {
        console.error(errorMsg, e);
        this.setState({
            showStickers: false,
            imError: _t(errorMsg),
        });
    }

    _updateWidget() {
        const stickerpickerWidget = WidgetUtils.getStickerEmojiPickerWidgets()[0];
        if (!stickerpickerWidget) {
            StickerEmojiPicker.currentWidget = null;
            this.setState({stickerpickerWidget: null, widgetId: null});
            return;
        }

        const currentWidget = StickerEmojiPicker.currentWidget;
        let currentUrl = null;
        if (currentWidget && currentWidget.content && currentWidget.content.url) {
            currentUrl = currentWidget.content.url;
        }

        let newUrl = null;
        if (stickerpickerWidget && stickerpickerWidget.content && stickerpickerWidget.content.url) {
            newUrl = stickerpickerWidget.content.url;
        }

        if (newUrl !== currentUrl) {
            // Destroy the existing frame so a new one can be created
            PersistedElement.destroyElement(PERSISTED_ELEMENT_KEY);
        }

        StickerEmojiPicker.currentWidget = stickerpickerWidget;
        this.setState({
            stickerpickerWidget,
            widgetId: stickerpickerWidget ? stickerpickerWidget.id : null,
        });
    }

    _onWidgetAction(payload) {
        switch (payload.action) {
            case "user_widget_updated":
                this.forceUpdate();
                break;

            case "stickerpicker_close":
                this.setState({showStickers: false});
                break;

            case "after_right_panel_phase_change":
            case "show_left_panel":
            case "hide_left_panel":
                this.setState({showStickers: false});
                break;

            case "show_stickers_tab":
                this.setState({
                    showStickersTab: true,
                    showEmojisTab: false
                });
                break;

            case "show_emojis_tab":
                this.setState({
                    showStickersTab: false,
                    showEmojisTab: true
                });
                break;
        }
    }

    _defaultStickerEmojiPickerContent() {
        return (
            <AccessibleButton onClick={this._launchManageIntegrations}
                className='mx_Stickers_contentPlaceholder'>
                <p>{ _t("You don't currently have any stickerpacks enabled") }</p>
                <p className='mx_Stickers_addLink'>{ _t("Add some now") }</p>
                <img src={require("../../../../res/img/stickerpack-placeholder.png")} alt="" />
            </AccessibleButton>
        );
    }

    _errorStickerEmojiPickerContent() {
        return (
            <div style={{"text-align": "center"}} className="error">
                <p> { this.state.imError } </p>
            </div>
        );
    }

    _sendVisibilityToWidget(visible) {
        if (!this.state.stickerpickerWidget) return;
        const widgetMessaging = ActiveWidgetStore.getWidgetMessaging(this.state.stickerpickerWidget.id);
        if (widgetMessaging && visible !== this._prevSentVisibility) {
            widgetMessaging.sendVisibility(visible);
            this._prevSentVisibility = visible;
        }
    }

    _getStickerEmojiPickerContent() {
        // Handle Integration Manager errors
        if (this.state._imError) {
            return this._errorStickerEmojiPickerContent();
        }

        // Stickers
        // TODO - Add support for StickerEmojiPickers from multiple app stores.
        // Render content from multiple stickerpack sources, each within their
        // own iframe, within the stickerpicker UI element.
        const stickerpickerWidget = this.state.stickerpickerWidget;
        let tabContent;

        // Use a separate ReactDOM tree to render the AppTile separately so that it persists and does
        // not unmount when we (a) close the sticker picker (b) switch rooms. It's properties are still
        // updated.
        const PersistedElement = sdk.getComponent("elements.PersistedElement");

        // Load stickerpack content

        if (this.state.showStickersTab) {
            if (stickerpickerWidget && stickerpickerWidget.content && stickerpickerWidget.content.url) {
                // Set default name
                stickerpickerWidget.content.name = stickerpickerWidget.name || _t("Stickerpack");

                tabContent = (
                    <div className='mx_Stickers_content_container'>
                        <div
                            id='stickersContent'
                            className='mx_Stickers_content'
                            style={{
                                border: 'none',
                                height: this.popoverHeight,
                                width: this.popoverWidth,
                            }}
                        >
                            <PersistedElement persistKey={PERSISTED_ELEMENT_KEY} style={{zIndex: STICKERPICKER_Z_INDEX}}>
                                <AppTile
                                    id={stickerpickerWidget.id}
                                    url={stickerpickerWidget.content.url}
                                    name={stickerpickerWidget.content.name}
                                    room={this.props.room}
                                    type={stickerpickerWidget.content.type}
                                    fullWidth={true}
                                    userId={MatrixClientPeg.get().credentials.userId}
                                    creatorUserId={stickerpickerWidget.sender || MatrixClientPeg.get().credentials.userId}
                                    waitForIframeLoad={true}
                                    show={true}
                                    showMenubar={true}
                                    onEditClick={this._launchManageIntegrations}
                                    onDeleteClick={this._removeStickerEmojiPickerWidgets}
                                    showTitle={false}
                                    showMinimise={true}
                                    showDelete={false}
                                    showCancel={false}
                                    showPopout={false}
                                    onMinimiseClick={this._onHideStickersClick}
                                    handleMinimisePointerEvents={true}
                                    whitelistCapabilities={['m.sticker', 'visibility']}
                                    userWidget={true}
                                />
                            </PersistedElement>
                        </div>
                    </div>
                );
            } else {
                // Default content to show if stickerpicker widget not added
                tabContent = this._defaultStickerEmojiPickerContent();
            }
        } else {
            tabContent = (
                <EmojiPicker
                    onChoose={this._onEmojiClick}
                    selectedEmojis={this.state.selectedEmojis}
                    showQuickReactions={true}
                />
            );
        }

        return (
            <div>
                <div className="mx_StickerEmojiPicker_buttons">
                    <AccessibleButton
                        className={this.state.showEmojisTab ? 'mx_StickerEmojiPicker_button mx_StickerEmojiPicker_highlight' : 'mx_StickerEmojiPicker_button'}
                        onClick={this._onTabSwitch}
                    >
                        { _t("Emoji") }
                    </AccessibleButton>
                    <AccessibleButton
                        className={this.state.showStickersTab ? 'mx_StickerEmojiPicker_button mx_StickerEmojiPicker_highlight' : 'mx_StickerEmojiPicker_button'}
                        onClick={this._onTabSwitch}
                    >
                        { _t("Stickers") }
                    </AccessibleButton>
                </div>
                { tabContent }
            </div>
        );
    }

    // Dev note: this isn't jsdoc because it's angry.
    /*
     * Show the sticker picker overlay
     * If no stickerpacks have been added, show a link to the integration manager add sticker packs page.
     */
    _onShowStickersClick(e) {
        if (!SettingsStore.getValue("integrationProvisioning")) {
            // Intercept this case and spawn a warning.
            return IntegrationManagers.sharedInstance().showDisabledDialog();
        }

        // XXX: Simplify by using a context menu that is positioned relative to the sticker picker button

        const buttonRect = e.target.getBoundingClientRect();

        // The window X and Y offsets are to adjust position when zoomed in to page
        let x = buttonRect.right + window.pageXOffset - 41;

        // Amount of horizontal space between the right of menu and the right of the viewport
        //  (10 = amount needed to make chevron centrally aligned)
        const rightPad = 10;

        // When the sticker picker would be displayed off of the viewport, adjust x
        //  (302 = width of context menu, including borders)
        x = Math.min(x, document.body.clientWidth - (302 + rightPad));

        // Offset the chevron location, which is relative to the left of the context menu
        //  (10 = offset when context menu would not be displayed off viewport)
        //  (2 = context menu borders)
        const stickerPickerChevronOffset = Math.max(10, 2 + window.pageXOffset + buttonRect.left - x);

        const y = (buttonRect.top + (buttonRect.height / 2) + window.pageYOffset) - 19;

        this.setState({
            showStickers: true,
            stickerPickerX: x,
            stickerPickerY: y,
            stickerPickerChevronOffset,
        });
    }

    /**
     * Trigger hiding of the sticker picker overlay
     * @param  {Event} ev Event that triggered the function call
     */
    _onHideStickersClick(ev) {
        this.setState({showStickers: false});
    }

    /**
     * Called when the window is resized
     */
    _onResize() {
        this.setState({showStickers: false});
    }

    /**
     * The stickers picker was hidden
     */
    _onFinished() {
        this.setState({showStickers: false});
    }

    /**
     * Launch the integration manager on the stickers integration page
     */
    _launchManageIntegrations() {
        // TODO: Open the right integration manager for the widget
        if (SettingsStore.isFeatureEnabled("feature_many_integration_managers")) {
            IntegrationManagers.sharedInstance().openAll(
                this.props.room,
                `type_${widgetType}`,
                this.state.widgetId,
            );
        } else {
            IntegrationManagers.sharedInstance().getPrimaryManager().open(
                this.props.room,
                `type_${widgetType}`,
                this.state.widgetId,
            );
        }
    }

    render() {
        let stickerPicker;
        let stickersButton;
        if (this.state.showStickers) {
            // Show hide-stickers button
            stickersButton =
                <AccessibleButton
                    id='stickersButton'
                    key="controls_hide_stickers"
                    className="mx_MessageComposer_button mx_MessageComposer_stickers mx_Stickers_hideStickers"
                    onClick={this._onHideStickersClick}
                    title={_t("Hide Stickers")}
                >
                </AccessibleButton>;

            const GenericElementContextMenu = sdk.getComponent('context_menus.GenericElementContextMenu');
            stickerPicker = <ContextMenu
                chevronOffset={this.state.stickerPickerChevronOffset}
                chevronFace="bottom"
                left={this.state.stickerPickerX}
                top={this.state.stickerPickerY}
                menuWidth={this.popoverWidth}
                menuHeight={this.popoverHeight}
                onFinished={this._onFinished}
                menuPaddingTop={0}
                menuPaddingLeft={0}
                menuPaddingRight={0}
                zIndex={STICKERPICKER_Z_INDEX}
            >
                <GenericElementContextMenu element={this._getStickerEmojiPickerContent()} onResize={this._onFinished} />
            </ContextMenu>;
        } else {
            // Show show-stickers button
            stickersButton =
                <AccessibleButton
                    id='stickersButton'
                    key="controls_show_stickers"
                    className="mx_MessageComposer_button mx_MessageComposer_stickers"
                    onClick={this._onShowStickersClick}
                    title={_t("Show Stickers")}
                >
                </AccessibleButton>;
        }
        return <React.Fragment>
            { stickersButton }
            { stickerPicker }
        </React.Fragment>;
    }
}
