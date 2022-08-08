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

import React from 'react';
import classNames from 'classnames';
import { MatrixEvent, MatrixEventEvent } from "matrix-js-sdk/src/models/event";
import { Relations, RelationsEvent } from 'matrix-js-sdk/src/models/relations';
import { MatrixClient } from 'matrix-js-sdk/src/matrix';
import {
    M_POLL_END,
    M_POLL_KIND_DISCLOSED,
    M_POLL_RESPONSE,
    M_POLL_START,
    NamespacedValue,
    PollAnswerSubevent,
    PollResponseEvent,
    PollStartEvent,
} from "matrix-events-sdk";
import { RelatedRelations } from "matrix-js-sdk/src/models/related-relations";

import { _t } from '../../../languageHandler';
import Modal from '../../../Modal';
import { IBodyProps } from "./IBodyProps";
import { formatCommaSeparatedList } from '../../../utils/FormattingUtils';
import StyledRadioButton from '../elements/StyledRadioButton';
import MatrixClientContext from "../../../contexts/MatrixClientContext";
import ErrorDialog from '../dialogs/ErrorDialog';
import { GetRelationsForEvent } from "../rooms/EventTile";
import PollCreateDialog from "../elements/PollCreateDialog";
import { MatrixClientPeg } from "../../../MatrixClientPeg";

interface IState {
    selected?: string; // Which option was clicked by the local user
    voteRelations: RelatedRelations; // Voting (response) events
    endRelations: RelatedRelations; // Poll end events
}

export function createVoteRelations(
    getRelationsForEvent: (
        eventId: string,
        relationType: string,
        eventType: string
    ) => Relations,
    eventId: string,
) {
    return new RelatedRelations([
        getRelationsForEvent(
            eventId,
            "m.reference",
            M_POLL_RESPONSE.name,
        ),
        getRelationsForEvent(
            eventId,
            "m.reference",
            M_POLL_RESPONSE.altName,
        ),
    ]);
}

export function findTopAnswer(
    pollEvent: MatrixEvent,
    matrixClient: MatrixClient,
    getRelationsForEvent?: (
        eventId: string,
        relationType: string,
        eventType: string
    ) => Relations,
): string {
    if (!getRelationsForEvent) {
        return "";
    }

    const poll = pollEvent.unstableExtensibleEvent as PollStartEvent;
    if (!poll?.isEquivalentTo(M_POLL_START)) {
        console.warn("Failed to parse poll to determine top answer - assuming no best answer");
        return "";
    }

    const findAnswerText = (answerId: string) => {
        return poll.answers.find(a => a.id === answerId)?.text ?? "";
    };

    const voteRelations = createVoteRelations(getRelationsForEvent, pollEvent.getId());

    const endRelations = new RelatedRelations([
        getRelationsForEvent(
            pollEvent.getId(),
            "m.reference",
            M_POLL_END.name,
        ),
        getRelationsForEvent(
            pollEvent.getId(),
            "m.reference",
            M_POLL_END.altName,
        ),
    ]);

    const userVotes: Map<string, UserVote> = collectUserVotes(
        allVotes(pollEvent, matrixClient, voteRelations, endRelations),
        matrixClient.getUserId(),
        null,
    );

    const votes: Map<string, number> = countVotes(userVotes, poll);
    const highestScore: number = Math.max(...votes.values());

    const bestAnswerIds: string[] = [];
    for (const [answerId, score] of votes) {
        if (score == highestScore) {
            bestAnswerIds.push(answerId);
        }
    }

    const bestAnswerTexts = bestAnswerIds.map(findAnswerText);

    return formatCommaSeparatedList(bestAnswerTexts, 3);
}

export function isPollEnded(
    pollEvent: MatrixEvent,
    matrixClient: MatrixClient,
    getRelationsForEvent?: (
        eventId: string,
        relationType: string,
        eventType: string
    ) => Relations,
): boolean {
    if (!getRelationsForEvent) {
        return false;
    }

    const roomCurrentState = matrixClient.getRoom(pollEvent.getRoomId()).currentState;
    function userCanRedact(endEvent: MatrixEvent) {
        return roomCurrentState.maySendRedactionForEvent(
            pollEvent,
            endEvent.getSender(),
        );
    }

    const endRelations = new RelatedRelations([
        getRelationsForEvent(
            pollEvent.getId(),
            "m.reference",
            M_POLL_END.name,
        ),
        getRelationsForEvent(
            pollEvent.getId(),
            "m.reference",
            M_POLL_END.altName,
        ),
    ]);

    if (!endRelations) {
        return false;
    }

    const authorisedRelations = endRelations.getRelations().filter(userCanRedact);

    return authorisedRelations.length > 0;
}

export function pollAlreadyHasVotes(mxEvent: MatrixEvent, getRelationsForEvent?: GetRelationsForEvent): boolean {
    if (!getRelationsForEvent) return false;

    const voteRelations = createVoteRelations(getRelationsForEvent, mxEvent.getId());
    return voteRelations.getRelations().length > 0;
}

export function launchPollEditor(mxEvent: MatrixEvent, getRelationsForEvent?: GetRelationsForEvent): void {
    if (pollAlreadyHasVotes(mxEvent, getRelationsForEvent)) {
        Modal.createDialog(
            ErrorDialog,
            {
                title: _t("Can't edit poll"),
                description: _t(
                    "Sorry, you can't edit a poll after votes have been cast.",
                ),
            },
        );
    } else {
        Modal.createDialog(
            PollCreateDialog,
            {
                room: MatrixClientPeg.get().getRoom(mxEvent.getRoomId()),
                threadId: mxEvent.getThread()?.id ?? null,
                editingMxEvent: mxEvent,
            },
            'mx_CompoundDialog',
            false, // isPriorityModal
            true,  // isStaticModal
        );
    }
}

export default class MPollBody extends React.Component<IBodyProps, IState> {
    public static contextType = MatrixClientContext;
    public context!: React.ContextType<typeof MatrixClientContext>;
    private seenEventIds: string[] = []; // Events we have already seen
    private voteRelationsReceived = false;
    private endRelationsReceived = false;

    constructor(props: IBodyProps) {
        super(props);

        this.state = {
            selected: null,
            voteRelations: this.fetchVoteRelations(),
            endRelations: this.fetchEndRelations(),
        };

        this.addListeners(this.state.voteRelations, this.state.endRelations);
        this.props.mxEvent.on(MatrixEventEvent.RelationsCreated, this.onRelationsCreated);
    }

    componentWillUnmount() {
        this.props.mxEvent.off(MatrixEventEvent.RelationsCreated, this.onRelationsCreated);
        this.removeListeners(this.state.voteRelations, this.state.endRelations);
    }

    private addListeners(voteRelations?: RelatedRelations, endRelations?: RelatedRelations) {
        if (voteRelations) {
            voteRelations.on(RelationsEvent.Add, this.onRelationsChange);
            voteRelations.on(RelationsEvent.Remove, this.onRelationsChange);
            voteRelations.on(RelationsEvent.Redaction, this.onRelationsChange);
        }
        if (endRelations) {
            endRelations.on(RelationsEvent.Add, this.onRelationsChange);
            endRelations.on(RelationsEvent.Remove, this.onRelationsChange);
            endRelations.on(RelationsEvent.Redaction, this.onRelationsChange);
        }
    }

    private removeListeners(voteRelations?: RelatedRelations, endRelations?: RelatedRelations) {
        if (voteRelations) {
            voteRelations.off(RelationsEvent.Add, this.onRelationsChange);
            voteRelations.off(RelationsEvent.Remove, this.onRelationsChange);
            voteRelations.off(RelationsEvent.Redaction, this.onRelationsChange);
        }
        if (endRelations) {
            endRelations.off(RelationsEvent.Add, this.onRelationsChange);
            endRelations.off(RelationsEvent.Remove, this.onRelationsChange);
            endRelations.off(RelationsEvent.Redaction, this.onRelationsChange);
        }
    }

    private onRelationsCreated = (relationType: string, eventType: string) => {
        if (relationType !== "m.reference") {
            return;
        }

        if (M_POLL_RESPONSE.matches(eventType)) {
            this.voteRelationsReceived = true;
            const newVoteRelations = this.fetchVoteRelations();
            this.addListeners(newVoteRelations);
            this.removeListeners(this.state.voteRelations);
            this.setState({ voteRelations: newVoteRelations });
        } else if (M_POLL_END.matches(eventType)) {
            this.endRelationsReceived = true;
            const newEndRelations = this.fetchEndRelations();
            this.addListeners(newEndRelations);
            this.removeListeners(this.state.endRelations);
            this.setState({ endRelations: newEndRelations });
        }

        if (this.voteRelationsReceived && this.endRelationsReceived) {
            this.props.mxEvent.removeListener(MatrixEventEvent.RelationsCreated, this.onRelationsCreated);
        }
    };

    private onRelationsChange = () => {
        // We hold Relations in our state, and they changed under us.
        // Check whether we should delete our selection, and then
        // re-render.
        // Note: re-rendering is a side effect of unselectIfNewEventFromMe().
        this.unselectIfNewEventFromMe();
    };

    private selectOption(answerId: string) {
        if (this.isEnded()) {
            return;
        }
        const userVotes = this.collectUserVotes();
        const userId = this.context.getUserId();
        const myVote = userVotes.get(userId)?.answers[0];
        if (answerId === myVote) {
            return;
        }

        const response = PollResponseEvent.from([answerId], this.props.mxEvent.getId()).serialize();

        this.context.sendEvent(
            this.props.mxEvent.getRoomId(),
            response.type,
            response.content,
        ).catch((e: any) => {
            console.error("Failed to submit poll response event:", e);

            Modal.createDialog(
                ErrorDialog,
                {
                    title: _t("Vote not registered"),
                    description: _t(
                        "Sorry, your vote was not registered. Please try again."),
                },
            );
        });

        this.setState({ selected: answerId });
    }

    private onOptionSelected = (e: React.FormEvent<HTMLInputElement>): void => {
        this.selectOption(e.currentTarget.value);
    };

    private fetchVoteRelations(): RelatedRelations | null {
        return this.fetchRelations(M_POLL_RESPONSE);
    }

    private fetchEndRelations(): RelatedRelations | null {
        return this.fetchRelations(M_POLL_END);
    }

    private fetchRelations(eventType: NamespacedValue<string, string>): RelatedRelations | null {
        if (this.props.getRelationsForEvent) {
            return new RelatedRelations([
                this.props.getRelationsForEvent(
                    this.props.mxEvent.getId(),
                    "m.reference",
                    eventType.name,
                ),
                this.props.getRelationsForEvent(
                    this.props.mxEvent.getId(),
                    "m.reference",
                    eventType.altName,
                ),
            ]);
        } else {
            return null;
        }
    }

    /**
     * @returns userId -> UserVote
     */
    private collectUserVotes(): Map<string, UserVote> {
        return collectUserVotes(
            allVotes(
                this.props.mxEvent,
                this.context,
                this.state.voteRelations,
                this.state.endRelations,
            ),
            this.context.getUserId(),
            this.state.selected,
        );
    }

    /**
     * If we've just received a new event that we hadn't seen
     * before, and that event is me voting (e.g. from a different
     * device) then forget when the local user selected.
     *
     * Either way, calls setState to update our list of events we
     * have already seen.
     */
    private unselectIfNewEventFromMe() {
        const newEvents: MatrixEvent[] = this.state.voteRelations.getRelations()
            .filter(isPollResponse)
            .filter((mxEvent: MatrixEvent) =>
                !this.seenEventIds.includes(mxEvent.getId()));
        let newSelected = this.state.selected;

        if (newEvents.length > 0) {
            for (const mxEvent of newEvents) {
                if (mxEvent.getSender() === this.context.getUserId()) {
                    newSelected = null;
                }
            }
        }
        const newEventIds = newEvents.map((mxEvent: MatrixEvent) => mxEvent.getId());
        this.seenEventIds = this.seenEventIds.concat(newEventIds);
        this.setState({ selected: newSelected });
    }

    private totalVotes(collectedVotes: Map<string, number>): number {
        let sum = 0;
        for (const v of collectedVotes.values()) {
            sum += v;
        }
        return sum;
    }

    private isEnded(): boolean {
        return isPollEnded(
            this.props.mxEvent,
            this.context,
            this.props.getRelationsForEvent,
        );
    }

    render() {
        const poll = this.props.mxEvent.unstableExtensibleEvent as PollStartEvent;
        if (!poll?.isEquivalentTo(M_POLL_START)) return null; // invalid

        const ended = this.isEnded();
        const pollId = this.props.mxEvent.getId();
        const userVotes = this.collectUserVotes();
        const votes = countVotes(userVotes, poll);
        const totalVotes = this.totalVotes(votes);
        const winCount = Math.max(...votes.values());
        const userId = this.context.getUserId();
        const myVote = userVotes.get(userId)?.answers[0];
        const disclosed = M_POLL_KIND_DISCLOSED.matches(poll.kind.name);

        // Disclosed: votes are hidden until I vote or the poll ends
        // Undisclosed: votes are hidden until poll ends
        const showResults = ended || (disclosed && myVote !== undefined);

        let totalText: string;
        if (ended) {
            totalText = _t(
                "Final result based on %(count)s votes",
                { count: totalVotes },
            );
        } else if (!disclosed) {
            totalText = _t("Results will be visible when the poll is ended");
        } else if (myVote === undefined) {
            if (totalVotes === 0) {
                totalText = _t("No votes cast");
            } else {
                totalText = _t(
                    "%(count)s votes cast. Vote to see the results",
                    { count: totalVotes },
                );
            }
        } else {
            totalText = _t("Based on %(count)s votes", { count: totalVotes });
        }

        const editedSpan = (
            this.props.mxEvent.replacingEvent()
                ? <span className="mx_MPollBody_edited"> ({ _t("edited") })</span>
                : null
        );

        return <div className="mx_MPollBody">
            <h2>{ poll.question.text }{ editedSpan }</h2>
            <div className="mx_MPollBody_allOptions">
                {
                    poll.answers.map((answer: PollAnswerSubevent) => {
                        let answerVotes = 0;
                        let votesText = "";

                        if (showResults) {
                            answerVotes = votes.get(answer.id) ?? 0;
                            votesText = _t("%(count)s votes", { count: answerVotes });
                        }

                        const checked = (
                            (!ended && myVote === answer.id) ||
                            (ended && answerVotes === winCount)
                        );
                        const cls = classNames({
                            "mx_MPollBody_option": true,
                            "mx_MPollBody_option_checked": checked,
                            "mx_MPollBody_option_ended": ended,
                        });

                        const answerPercent = (
                            totalVotes === 0
                                ? 0
                                : Math.round(100.0 * answerVotes / totalVotes)
                        );
                        return <div
                            key={answer.id}
                            className={cls}
                            onClick={() => this.selectOption(answer.id)}
                        >
                            { (
                                ended
                                    ? <EndedPollOption
                                        answer={answer}
                                        checked={checked}
                                        votesText={votesText} />
                                    : <LivePollOption
                                        pollId={pollId}
                                        answer={answer}
                                        checked={checked}
                                        votesText={votesText}
                                        onOptionSelected={this.onOptionSelected} />
                            ) }
                            <div className="mx_MPollBody_popularityBackground">
                                <div
                                    className="mx_MPollBody_popularityAmount"
                                    style={{ "width": `${answerPercent}%` }}
                                />
                            </div>
                        </div>;
                    })
                }
            </div>
            <div className="mx_MPollBody_totalVotes">
                { totalText }
            </div>
        </div>;
    }
}

interface IEndedPollOptionProps {
    answer: PollAnswerSubevent;
    checked: boolean;
    votesText: string;
}

function EndedPollOption(props: IEndedPollOptionProps) {
    const cls = classNames({
        "mx_MPollBody_endedOption": true,
        "mx_MPollBody_endedOptionWinner": props.checked,
    });
    return <div className={cls} data-value={props.answer.id}>
        <div className="mx_MPollBody_optionDescription">
            <div className="mx_MPollBody_optionText">
                { props.answer.text }
            </div>
            <div className="mx_MPollBody_optionVoteCount">
                { props.votesText }
            </div>
        </div>
    </div>;
}

interface ILivePollOptionProps {
    pollId: string;
    answer: PollAnswerSubevent;
    checked: boolean;
    votesText: string;
    onOptionSelected: (e: React.FormEvent<HTMLInputElement>) => void;
}

function LivePollOption(props: ILivePollOptionProps) {
    return <StyledRadioButton
        className="mx_MPollBody_live-option"
        name={`poll_answer_select-${props.pollId}`}
        value={props.answer.id}
        checked={props.checked}
        onChange={props.onOptionSelected}
    >
        <div className="mx_MPollBody_optionDescription">
            <div className="mx_MPollBody_optionText">
                { props.answer.text }
            </div>
            <div className="mx_MPollBody_optionVoteCount">
                { props.votesText }
            </div>
        </div>
    </StyledRadioButton>;
}

export class UserVote {
    constructor(public readonly ts: number, public readonly sender: string, public readonly answers: string[]) {
    }
}

function userResponseFromPollResponseEvent(event: MatrixEvent): UserVote {
    const response = event.unstableExtensibleEvent as PollResponseEvent;
    if (!response?.isEquivalentTo(M_POLL_RESPONSE)) {
        throw new Error("Failed to parse Poll Response Event to determine user response");
    }

    return new UserVote(
        event.getTs(),
        event.getSender(),
        response.answerIds,
    );
}

export function allVotes(
    pollEvent: MatrixEvent,
    matrixClient: MatrixClient,
    voteRelations: RelatedRelations,
    endRelations: RelatedRelations,
): Array<UserVote> {
    const endTs = pollEndTs(pollEvent, matrixClient, endRelations);

    function isOnOrBeforeEnd(responseEvent: MatrixEvent): boolean {
        // From MSC3381:
        // "Votes sent on or before the end event's timestamp are valid votes"
        return (
            endTs === null ||
            responseEvent.getTs() <= endTs
        );
    }

    if (voteRelations) {
        return voteRelations.getRelations()
            .filter(isPollResponse)
            .filter(isOnOrBeforeEnd)
            .map(userResponseFromPollResponseEvent);
    } else {
        return [];
    }
}

/**
 * Returns the earliest timestamp from the supplied list of end_poll events
 * or null if there are no authorised events.
 */
export function pollEndTs(
    pollEvent: MatrixEvent,
    matrixClient: MatrixClient,
    endRelations: RelatedRelations,
): number | null {
    if (!endRelations) {
        return null;
    }

    const roomCurrentState = matrixClient.getRoom(pollEvent.getRoomId()).currentState;
    function userCanRedact(endEvent: MatrixEvent) {
        return roomCurrentState.maySendRedactionForEvent(
            pollEvent,
            endEvent.getSender(),
        );
    }

    const tss: number[] = (
        endRelations
            .getRelations()
            .filter(userCanRedact)
            .map((evt: MatrixEvent) => evt.getTs())
    );

    if (tss.length === 0) {
        return null;
    } else {
        return Math.min(...tss);
    }
}

function isPollResponse(responseEvent: MatrixEvent): boolean {
    return responseEvent.unstableExtensibleEvent?.isEquivalentTo(M_POLL_RESPONSE);
}

/**
 * Figure out the correct vote for each user.
 * @returns a Map of user ID to their vote info
 */
function collectUserVotes(
    userResponses: Array<UserVote>,
    userId: string,
    selected?: string,
): Map<string, UserVote> {
    const userVotes: Map<string, UserVote> = new Map();

    for (const response of userResponses) {
        const otherResponse = userVotes.get(response.sender);
        if (!otherResponse || otherResponse.ts < response.ts) {
            userVotes.set(response.sender, response);
        }
    }

    if (selected) {
        userVotes.set(userId, new UserVote(0, userId, [selected]));
    }

    return userVotes;
}

function countVotes(
    userVotes: Map<string, UserVote>,
    pollStart: PollStartEvent,
): Map<string, number> {
    const collected = new Map<string, number>();

    for (const response of userVotes.values()) {
        const tempResponse = PollResponseEvent.from(response.answers, "$irrelevant");
        tempResponse.validateAgainst(pollStart);
        if (!tempResponse.spoiled) {
            for (const answerId of tempResponse.answerIds) {
                if (collected.has(answerId)) {
                    collected.set(answerId, collected.get(answerId) + 1);
                } else {
                    collected.set(answerId, 1);
                }
            }
        }
    }

    return collected;
}
