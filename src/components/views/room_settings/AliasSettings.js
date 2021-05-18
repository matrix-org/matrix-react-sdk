/*
Copyright 2016 OpenMarket Ltd
Copyright 2018, 2019 New Vector Ltd

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

import EditableItemList from "../elements/EditableItemList";
import React, {createRef} from 'react';
import PropTypes from 'prop-types';
import {MatrixClientPeg} from "../../../MatrixClientPeg";
import * as sdk from "../../../index";
import { _t } from '../../../languageHandler';
import ErrorDialog from "../dialogs/ErrorDialog";
import AccessibleButton from "../elements/AccessibleButton";
import Modal from "../../../Modal";
import PublishedAliases from "./PublishedAliases";
import RoomPublishSetting from "./RoomPublishSetting";
import {replaceableComponent} from "../../../utils/replaceableComponent";

class EditableAliasesList extends EditableItemList {
    constructor(props) {
        super(props);

        this._aliasField = createRef();
    }

    _onAliasAdded = async () => {
        await this._aliasField.current.validate({ allowEmpty: false });

        if (this._aliasField.current.isValid) {
            if (this.props.onItemAdded) this.props.onItemAdded(this.props.newItem);
            return;
        }

        this._aliasField.current.focus();
        this._aliasField.current.validate({ allowEmpty: false, focused: true });
    };

    _renderNewItemField() {
        // if we don't need the RoomAliasField,
        // we don't need to overriden version of _renderNewItemField
        if (!this.props.domain) {
            return super._renderNewItemField();
        }
        const RoomAliasField = sdk.getComponent('views.elements.RoomAliasField');
        const onChange = (alias) => this._onNewItemChanged({target: {value: alias}});
        return (
            <form
                onSubmit={this._onAliasAdded}
                autoComplete="off"
                noValidate={true}
                className="mx_EditableItemList_newItem"
            >
                <RoomAliasField
                    ref={this._aliasField}
                    onChange={onChange}
                    value={this.props.newItem || ""}
                    domain={this.props.domain} />
                <AccessibleButton onClick={this._onAliasAdded} kind="primary">
                    { _t("Add") }
                </AccessibleButton>
            </form>
        );
    }
}

@replaceableComponent("views.room_settings.AliasSettings")
export default class AliasSettings extends React.Component {
    static propTypes = {
        roomId: PropTypes.string.isRequired,
        canSetCanonicalAlias: PropTypes.bool.isRequired,
        canSetAliases: PropTypes.bool.isRequired,
    };

    static defaultProps = {
        canSetAliases: false,
        canSetCanonicalAlias: false,
        aliasEvents: [],
    };

    constructor(props) {
        super(props);

        const state = {
            localAliases: [], // [ #alias:my-hs.tld, ... ]
            localAliasesLoading: false,
            detailsOpen: false,
        };

        this.state = state;
    }

    componentDidMount() {
        if (this.props.canSetCanonicalAlias) {
            // load local aliases for providing recommendations
            // for the canonical alias and alt_aliases
            this.loadLocalAliases();
        }
    }

    async loadLocalAliases() {
        this.setState({ localAliasesLoading: true });
        try {
            const cli = MatrixClientPeg.get();
            let localAliases = [];
            if (await cli.doesServerSupportUnstableFeature("org.matrix.msc2432")) {
                const response = await cli.unstableGetLocalAliases(this.props.roomId);
                if (Array.isArray(response.aliases)) {
                    localAliases = response.aliases;
                }
            }
            this.setState({ localAliases });
        } finally {
            this.setState({ localAliasesLoading: false });
        }
    }

    onNewAliasChanged = (value) => {
        this.setState({newAlias: value});
    };

    onLocalAliasAdded = (alias) => {
        if (!alias || alias.length === 0) return; // ignore attempts to create blank aliases

        const localDomain = MatrixClientPeg.get().getDomain();
        if (!alias.includes(':')) alias += ':' + localDomain;

        MatrixClientPeg.get().createAlias(alias, this.props.roomId).then(() => {
            this.setState({
                localAliases: this.state.localAliases.concat(alias),
                newAlias: null,
            });
        }).catch((err) => {
            console.error(err);
            Modal.createTrackedDialog('Error creating address', '', ErrorDialog, {
                title: _t("Error creating address"),
                description: _t(
                    "There was an error creating that address. It may not be allowed by the server " +
                    "or a temporary failure occurred.",
                ),
            });
        });
    };

    onLocalAliasDeleted = (index) => {
        const alias = this.state.localAliases[index];
        // TODO: In future, we should probably be making sure that the alias actually belongs
        // to this room. See https://github.com/vector-im/element-web/issues/7353
        MatrixClientPeg.get().deleteAlias(alias).then(() => {
            const localAliases = this.state.localAliases.filter(a => a !== alias);
            this.setState({localAliases});
        }).catch((err) => {
            console.error(err);
            let description;
            if (err.errcode === "M_FORBIDDEN") {
                description = _t("You don't have permission to delete the address.");
            } else {
                description = _t(
                    "There was an error removing that address. It may no longer exist or a temporary " +
                    "error occurred.",
                );
            }
            Modal.createTrackedDialog('Error removing address', '', ErrorDialog, {
                title: _t("Error removing address"),
                description,
            });
        });
    };

    onLocalAliasesToggled = (event) => {
        // expanded
        if (event.target.open) {
            // if local aliases haven't been preloaded yet at component mount
            if (!this.props.canSetCanonicalAlias && this.state.localAliases.length === 0) {
                this.loadLocalAliases();
            }
        }
        this.setState({detailsOpen: event.target.open});
    };

    render() {
        const localDomain = MatrixClientPeg.get().getDomain();

        const room = MatrixClientPeg.get().getRoom(this.props.roomId);

        let localAliasesList;
        if (this.state.localAliasesLoading) {
            const Spinner = sdk.getComponent("elements.Spinner");
            localAliasesList = <Spinner />;
        } else {
            localAliasesList = (<EditableAliasesList
                id="roomAliases"
                className={"mx_RoomSettings_localAliases"}
                items={this.state.localAliases}
                newItem={this.state.newAlias}
                onNewItemChanged={this.onNewAliasChanged}
                canRemove={this.props.canSetAliases}
                canEdit={this.props.canSetAliases}
                onItemAdded={this.onLocalAliasAdded}
                onItemRemoved={this.onLocalAliasDeleted}
                noItemsLabel={_t('This room has no local addresses')}
                placeholder={_t('Local address')}
                domain={localDomain}
            />);
        }

        return (
            <div className='mx_AliasSettings'>
                <PublishedAliases room={room} localAliases={this.state.localAliases} />
                <span className='mx_SettingsTab_subheading mx_AliasSettings_localAliasHeader'>{_t("Local Addresses")}</span>
                <p>{_t("Set addresses for this room so users can find this room through your homeserver (%(localDomain)s)", {localDomain})}</p>
                <details onToggle={this.onLocalAliasesToggled}>
                    <summary>{ this.state.detailsOpen ? _t('Show less') : _t("Show more")}</summary>
                    {localAliasesList}
                </details>
            </div>
        );
    }
}
