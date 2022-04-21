import { MatrixEvent } from "matrix-js-sdk/src/matrix";
import { M_TEXT, M_POLL_START, POLL_ANSWER, M_POLL_KIND_DISCLOSED } from "matrix-events-sdk";

export const makePollStartEvent = (
    question: string,
    sender: string,
    answers?: POLL_ANSWER[],
): MatrixEvent => {
    if (!answers) {
        answers = [
            { "id": "socks", [M_TEXT.name]: "Socks" },
            { "id": "shoes", [M_TEXT.name]: "Shoes" },
        ];
    }

    return new MatrixEvent(
        {
            "event_id": "$mypoll",
            "room_id": "#myroom:example.com",
            "sender": sender,
            "type": M_POLL_START.name,
            "content": {
                [M_POLL_START.name]: {
                    "question": {
                        [M_TEXT.name]: question,
                    },
                    "kind": M_POLL_KIND_DISCLOSED.name,
                    "answers": answers,
                },
                [M_TEXT.name]: `${question}: answers`,
            },
        },
    );
};
