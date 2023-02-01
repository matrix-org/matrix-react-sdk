
import { PollStartEvent } from 'matrix-js-sdk/src/extensible_events_v1/PollStartEvent';
import { MatrixEvent } from 'matrix-js-sdk/src/matrix';
import React from 'react';

interface Props {
    event: MatrixEvent
}

const PollListItem: React.FC<Props> = ({ event }) => {
    const pollEvent = event.unstableExtensibleEvent as unknown as PollStartEvent;
    if (!pollEvent) {
        return null;
    }
    return <li
        data-testid={`pollListItem-${event.getId()!}`}
        className='mx_PollListItem'>
        { pollEvent.question.text }
    </li>;
};

export default PollListItem;
