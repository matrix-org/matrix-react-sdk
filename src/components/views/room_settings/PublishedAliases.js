/*
Copyright 2020 New Vector Ltd

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

import React, {useContext, useEffect, useReducer} from 'react';
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import { _t } from '../../../languageHandler';
import EditableItemList from "../elements/EditableItemList";
import OverlaySpinner from "../elements/OverlaySpinner";
import Modal from "../../../Modal";
import ErrorDialog from "../dialogs/ErrorDialog";
import Field from "../elements/Field";
import AccessibleButton from "../elements/AccessibleButton";
import RoomPublishSetting from "./RoomPublishSetting";

/*
We kind of have three sources of truth here:
1. what the user is trying to set the state to
2. what we think the server state is
3. what the latest room state update is

when state changes, we then need to represent:
1. i am trying to change this
2. i have changed this but it's not synced back yet
3. this is synced

also state may be changed by someone else. how do we handle that?
*/

const UPDATE_ALT_ALIAS = 'update_alt_alias';
const SYNCED_ALIASES = 'synced_aliases';
const BEGIN_COMMIT = 'begin_commit';
const END_COMMIT = 'end_commit';
const ABORT_COMMIT = 'abort_commit';

export function reducer(state, action) {
    switch (action.type) {
        case UPDATE_ALT_ALIAS:
            return {...state, newAltAlias: action.value, error: undefined};
        case SYNCED_ALIASES:
            return {
                ...state,
                alt: {
                    synced: action.alt,
                    working: action.alt,
                },
                canonical: {
                    synced: action.canonical,
                    working: action.canonical,
                },
            };
        case BEGIN_COMMIT:
            if (!action.submitting) throw new Error("Missing 'submitting' value in BEGIN_COMMIT");
            return {
                ...state,
                alt: {
                    ...state.alt,
                    working: action.alt ? action.alt : state.alt.working,
                },
                canonical: {
                    ...state.canonical,
                    working: (action.canonical !== undefined) ? action.canonical : state.canonical.working,
                },
                submitting: action.submitting,
                regarding: action.regarding,
                error: undefined,
            };
        case END_COMMIT:
            return {
                ...state,
                submitting: null,
                newAltAlias: state.submitting === 'add' ? "" : state.newAltAlias,
                regarding: undefined,
            };
        case ABORT_COMMIT:
            return {
                ...state,
                submitting: null,
                alt: {
                    synced: state.alt.synced,
                    working: state.alt.synced,
                },
                canonical: {
                    synced: state.canonical.synced,
                    working: state.canonical.synced,
                },
                error: {...action.error, during: state.submitting},
            };
        default:
            return state;
    }
}

/* This entire class exists so we can:
 * 1. Add a tooltip to the field
 * 2. Do validation
 */
class EditableAltAliasList extends EditableItemList {
    _onAliasAdded = () => {
        this.props.onItemAdded(this.props.newItem);
    };

    _renderNewItemField() {
        return (
            <form
                onSubmit={this._onAliasAdded}
                autoComplete="off"
                noValidate={true}
                className="mx_EditableItemList_newItem"
            >
                <Field
                    label={this.props.placeholder}
                    className="mx_RoomAliasField"
                    type="text"
                    autoComplete="off"
                    prefix={<span>#</span>}
                    value={this.props.newItem || ""}
                    onChange={this._onNewItemChanged}
                    list={this.props.suggestionsListId}
                    flagInvalid={this.props.error ? true : undefined}
                    tooltipContent={this.props.error}
                />
                <AccessibleButton onClick={this._onAliasAdded} kind="primary">
                    { _t("Add") }
                </AccessibleButton>
            </form>
        );
    }
}

export function PublishedAliases({ room, localAliases }) {
    const client = useContext(MatrixClientContext);
    const canSetCanonicalAlias = room.currentState.mayClientSendStateEvent("m.room.canonical_alias", client);
    const initialAltAliases = room.getAltAliases();
    const initialCanonicalAlias = room.getCanonicalAlias();

    /*
     * Reasons why an alias change failed.
     * Note that if one of the errors listed here happens while adding an alias, we report it in a tooltip.
     */
    const errorReasons = {
        "M_BAD_ALIAS": _t("Room alias does not point to the room"),
        "M_INVALID_PARAM": _t("The server rejected the room alias as invalid"),
    };

    const [state, dispatch] = useReducer(reducer, {
        alt: {
            synced: initialAltAliases,
            working: initialAltAliases,
        },
        canonical: {
            synced: initialCanonicalAlias,
            working: initialCanonicalAlias,
        },
        newAltAlias: "",
        submitting: null,
    });

    /* This action dispatches a given state to the server.  Called after we've dispatched to update local state
     * to reflect the change that was made */
    async function submitChanges(updatedState) {
        if (updatedState === undefined) throw new Error("Unable to completeCommit: updatedState is undefined");

        const alt = updatedState.alt.working;
        const canonical = updatedState.canonical.working;
        const { submitting } = updatedState;

        const content = { alt_aliases: alt };
        if (canonical) {
            content['alias'] = canonical;
        }

        try {
            await client.sendStateEvent(room.roomId, "m.room.canonical_alias", content, "");
            dispatch({type: END_COMMIT});
        } catch (err) {
            console.error(`Error updating aliases in ${room.roomId}`, err);
            dispatch({type: ABORT_COMMIT, error: err});

            if (submitting == 'canonical') {
                Modal.createTrackedDialog('Error updating main address', '', ErrorDialog, {
                    title: _t("Error updating main address"),
                    description: _t(
                        "There was an error updating the room's main address. It may not be allowed by the server " +
                        "or a temporary failure occurred.",
                    ),
                });
            } else if (submitting != 'add' || !(errorReasons[err.errcode])) {
                /* Errors while adding aliases are reported inline */
                /* Also show an error dialog if we don't have a specific, short message to show for a failed add */
                Modal.createTrackedDialog('Error updating alternative addresses', '', ErrorDialog, {
                    title: _t("Error updating alternative addresses"),
                    description: _t(
                        "There was an error updating the room's alternative addresses. " +
                        "It may not be allowed by the server or a temporary failure occurred.",
                    ),
                });
            }
        }
    }

    async function onSetCanonical(canonical) {
        const action = {
            canonical,
            type: BEGIN_COMMIT,
            submitting: 'canonical',
        };
        await dispatch(action);
        return submitChanges(reducer(state, action));
    }

    async function onRemoveAlias(index) {
        const alt = state.alt.working.slice();
        alt.splice(index, 1);
        const action = {
            alt,
            type: BEGIN_COMMIT,
            submitting: 'remove',
            regarding: state.alt.working[index],
        };
        await dispatch(action);
        /* State doesn't update until after this, but that doesn't mean we can't infer it */
        return submitChanges(reducer(state, action));
    }

    function onAddAlias(alias) {
        if (state.submitting) return;
        const fullAlias = alias.trim().startsWith("#") ? alias.trim() : "#" + alias.trim();
        if (state.alt.working.some((existing) => existing == fullAlias)) {
            /* If the user tries to submit something in the list, pretend we did a dispatch */
            dispatch({
                type: UPDATE_ALT_ALIAS,
                value: '',
            });
        } else {
            const alt = state.alt.working.slice();
            alt.push(fullAlias);
            const action = {
                alt,
                type: BEGIN_COMMIT,
                submitting: 'add',
                regarding: fullAlias,
            };
            dispatch(action);
            /* State doesn't update until after this, but that doesn't mean we can't infer it */
            return submitChanges(reducer(state, action));
        }
    }

    /* Any updates from the server need to be immediately reflected in the UI */
    useEffect(() => {
        function handleEvent(event, state) {
            if (event.getRoomId() !== room.roomId) return;
            if (event.getType() !== "m.room.canonical_alias") return;

            dispatch({
                type: 'synced_aliases',
                alt: room.getAltAliases(),
                canonical: room.getCanonicalAlias(),
            });
        }

        client.on("RoomState.events", handleEvent);
        return () => client.off("RoomState.events", handleEvent);
    }, [client, room]);

    const error = state.error && errorReasons[state.error.errcode];

    /* Alternate aliases must be either an existing local alias, or an existing remote alias.  Suggest all existing
     * local aliases that are not already in the alt alias list. */
    const altSuggestions = localAliases && localAliases.filter((alias) =>
      !state.alt.working.includes(alias),
    ).map((alias) => alias.replace(/^#/, '')); // strip the # for display

    /* Canonical aliases can be either existing local aliases or existing alt aliases */
    const canonicalSuggestions = Array.from(new Set([...state.alt.working, ...(localAliases || [])]));
    const explicitlyInclude = (state.canonical.working && !canonicalSuggestions.includes(state.canonical.working));

    return (
        <OverlaySpinner active={!!state.submitting}>
            <span className='mx_SettingsTab_subheading'>{_t("Published Addresses")}</span>
            <p>{_t("Published addresses can be used by anyone on any server to join your room. " +
                "To publish an address, it needs to be set as a local address first.")}</p>
            <Field onChange={(ev) => onSetCanonical(ev.target.value)} value={state.canonical.working || ''}
                   disabled={!canSetCanonicalAlias || !!state.submitting}
                   element='select' id='canonicalAlias' label={_t('Main address')}>
                <option value="" key="unset">{ _t('not specified') }</option>
                {canonicalSuggestions.map((alias, i) =>
                  <option value={alias} key={i}>{alias}</option>)}
                {explicitlyInclude && <option key="explicit" value={state.canonical.working}>
                    {state.canonical.working}</option>}
            </Field>
            <RoomPublishSetting roomId={room.roomId} canSetCanonicalAlias={canSetCanonicalAlias} />
            <datalist id="mx_AliasSettings_altRecommendations">
                {altSuggestions && altSuggestions.map(alias =>
                    <option value={alias} key={alias} />,
                )}
            </datalist>
            <EditableAltAliasList
                canEdit={canSetCanonicalAlias}
                canRemove={canSetCanonicalAlias || !!state.submitting}
                className="mx_RoomSettings_altAliases"
                error={error}
                id="roomAltAliases"
                items={state.alt.working}
                itemsLabel={_t('Other published addresses:')}
                newItem={state.newAltAlias}
                noItemsLabel={canSetCanonicalAlias ?
                    _t('No other published addresses yet, add one below') :
                    _t('No other published addresses yet.')}
                onItemAdded={onAddAlias}
                onItemRemoved={onRemoveAlias}
                onNewItemChanged={(value) => dispatch({value, type: UPDATE_ALT_ALIAS})}
                placeholder={_t('New published address (e.g. #alias:server)')}
                suggestionsListId="mx_AliasSettings_altRecommendations"
            />
        </OverlaySpinner>);
}

export default undefined;
