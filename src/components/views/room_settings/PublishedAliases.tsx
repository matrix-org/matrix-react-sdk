/*
Copyright 2020 The Matrix.org Foundation C.I.C.

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

import React, {useContext, useEffect, useReducer, useRef} from 'react';
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import { _t } from '../../../languageHandler';
import EditableItemList from "../elements/EditableItemList";
import OverlaySpinner from "../elements/OverlaySpinner";
import Modal from "../../../Modal";
import ErrorDialog from "../dialogs/ErrorDialog";
import Field from "../elements/Field";
import AccessibleButton from "../elements/AccessibleButton";
import RoomPublishSetting from "./RoomPublishSetting";

const UPDATE_ALT_ALIAS = 'update_alt_alias';
const SYNCED_ALIASES = 'synced_aliases';
const BEGIN_COMMIT = 'begin_commit';
const END_COMMIT = 'end_commit';
const ABORT_COMMIT = 'abort_commit';

interface State {
    alt: {
        synced: string[],
        working: string[],
    },
    canonical: {
        synced: string,
        working: string,
    },
    submitting: string | undefined,
    regarding: string | undefined,
    error: Error & { during?: string, errcode?: string } | undefined,
    newAltAlias: string,
}

type Alts = string[];

interface AUpdateAlias {
    type: 'update_alt_alias',
    value: string,
}

interface ASyncedAliases {
    type: 'synced_aliases',
    alt: Alts,
    canonical: string | undefined,
}

interface ABeginCommit {
    type: 'begin_commit',
    submitting: 'add' | 'remove' | 'canonical',
    alt?: Alts,
    canonical?: string,
    regarding?: string,
}

interface AEndCommit {
    type: 'end_commit'
}

interface AAbortCommit {
    type: 'abort_commit',
    error: Error
}

type Action = AUpdateAlias | ASyncedAliases | ABeginCommit | AEndCommit | AAbortCommit;

/*
 * 'synced' represents the latest state event from the server.
 * 'working' represents what we think the server state should be, based on what we've asked it to do
 */
export function reducer(state: State, action: Action): State {
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
 * TODO: Fixing up this, and AliasSettings, to not need a subclass is a very
 * likely candidate for further cleanup
 */

class EditableAltAliasList extends EditableItemList {
    private _publishedAliasField = React.createRef<Field>();

    _onAliasAdded = () => {
        this.props.onItemAdded(this.props.newItem);

        this._publishedAliasField.current.focus();
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
                    ref={this._publishedAliasField}
                    label={this.props.placeholder}
                    className="mx_RoomAliasField"
                    type="text"
                    autoComplete="off"
                    prefixComponent={<span>#</span>}
                    value={this.props.newItem || ""}
                    onChange={this._onNewItemChanged}
                    list={this.props.suggestionsListId}
                    tooltipContent={this.props.error}
                    forceTooltipVisible={true}
                />
                <AccessibleButton onClick={this._onAliasAdded} kind="primary">
                    { _t("Add") }
                </AccessibleButton>
            </form>
        );
    }
}

function useIsMountedRef() {
    const isMounted = useRef(null);
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        }
    });
    return isMounted;
}

export default function PublishedAliases({ room, localAliases }) {
    const client: any = useContext(MatrixClientContext);
    const canSetCanonicalAlias = room.currentState.mayClientSendStateEvent("m.room.canonical_alias", client);
    const initialAltAliases = room.getAltAliases();
    const initialCanonicalAlias = room.getCanonicalAlias();
    const isMounted = useIsMountedRef();

    /*
     * Reasons why an alias change failed.
     * Note that if one of the errors listed here happens while adding an alias, we report it in a tooltip.
     * Otherwise we report in a dialog box.
     */
    const errorReasons = {
        "M_BAD_ALIAS": _t("Room address does not point to the room"),
        "M_INVALID_PARAM": _t("The server rejected the room address as invalid"),
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
    } as State);

    /* This action dispatches a given state to the server.  Called after we've dispatched to update local state
     * to reflect the change that was made */
    async function submitChanges(updatedState: State) {
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
            if (isMounted.current) dispatch({type: END_COMMIT});
        } catch (err) {
            console.error(`Error updating aliases in ${room.roomId}`, err);

            /* Don't throw up a dialog if the user closed the parent */
            if (!isMounted.current) return;

            dispatch({type: ABORT_COMMIT, error: err});

            if (submitting === 'canonical') {
                Modal.createTrackedDialog('Error updating main address', '', ErrorDialog, {
                    title: _t("Error updating main address"),
                    description: _t(
                        "There was an error updating the room's main address. It may not be allowed by the server " +
                        "or a temporary failure occurred.",
                    ),
                });
            } else if (submitting !== 'add' || !(errorReasons[err.errcode])) {
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

    async function onSetCanonical(canonical: string) {
        const action: ABeginCommit = {
            canonical,
            type: BEGIN_COMMIT,
            submitting: 'canonical',
        };
        dispatch(action);
        /* State doesn't update until after this, but that doesn't mean we can't infer it */
        return submitChanges(reducer(state, action));
    }

    async function onRemoveAlias(index: number) {
        const alt = state.alt.working.slice();
        alt.splice(index, 1);
        const action: ABeginCommit = {
            alt,
            type: BEGIN_COMMIT,
            submitting: 'remove',
            regarding: state.alt.working[index],
        };
        dispatch(action);
        /* State doesn't update until after this, but that doesn't mean we can't infer it */
        return submitChanges(reducer(state, action));
    }

    function onAddAlias(alias: string) {
        if (state.submitting) return;
        if (alias.trim().length === 0) return;
        const fullAlias = alias.trim().startsWith("#") ? alias.trim() : "#" + alias.trim();
        if (state.alt.working.some((existing) => existing === fullAlias)) {
            /* If the user tries to submit something in the list, pretend we did a dispatch */
            dispatch({
                type: UPDATE_ALT_ALIAS,
                value: '',
            });
        } else {
            const alt = state.alt.working.slice();
            alt.push(fullAlias);
            const action: ABeginCommit = {
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
        function handleEvent(event: any) {
            if (event.getRoomId() !== room.roomId) return;
            if (event.getType() !== "m.room.canonical_alias") return;

            if (isMounted.current) {
                dispatch({
                    type: 'synced_aliases',
                    alt: room.getAltAliases(),
                    canonical: room.getCanonicalAlias(),
                });
            }
        }

        client.on("RoomState.events", handleEvent);
        return () => client.off("RoomState.events", handleEvent);
    }, [client, room]); // eslint-disable-line react-hooks/exhaustive-deps

    const error = state.error && errorReasons[state.error.errcode];

    /* Alternate aliases must be either an existing local alias, or an existing remote alias.  Suggest all existing
     * local aliases that are not already in the alt alias list. */
    const altSuggestions = localAliases && localAliases.filter((alias: string) =>
        !state.alt.working.includes(alias),
    ).map((alias: string) => alias.replace(/^#/, '')); // strip the # for display

    /* Canonical aliases can be either existing local aliases or existing alt aliases */
    const canonicalSuggestions = Array.from(new Set([...state.alt.working, ...(localAliases || [])]));

    /* A canonical alias may represent an alias that's not in the current alt aliases list.
     * When this happens, we need to add it manually so the user can see it in the dropdown */
    const explicitlyInclude = (state.canonical.working && !canonicalSuggestions.includes(state.canonical.working));

    return (
        <OverlaySpinner active={!!state.submitting}>
            <span className='mx_SettingsTab_subheading'>{_t("Published Addresses")}</span>
            <p>{_t("Published addresses can be used by anyone on any server to join your room. " +
                "To publish an address, it needs to be set as a local address first.")}</p>
            <Field
                disabled={!canSetCanonicalAlias || !!state.submitting}
                element='select'
                id='canonicalAlias'
                label={_t('Main address')}
                onChange={(ev: React.ChangeEvent<HTMLSelectElement>) => onSetCanonical(ev.target.value)}
                value={state.canonical.working || ''}
            >
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
                placeholder={_t('New published address (e.g. #address:server)')}
                suggestionsListId="mx_AliasSettings_altRecommendations"
            />
        </OverlaySpinner>);
}
