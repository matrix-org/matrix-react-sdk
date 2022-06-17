import json
import logging
from typing import Dict, Tuple
from typing_extensions import Literal
import synapse

logger = logging.getLogger(__name__)

class Bouncer:
    def __init__(self, config: dict, api: "synapse.module_api.ModuleApi") -> None:
        api.register_spam_checker_callbacks(
            check_event_for_spam=self.check_event_for_spam,
        )
    async def check_event_for_spam(self, event: "synapse.events.EventBase") -> Tuple[Literal["NOT_SPAM"], "synapse.api.errors.Codes"]:
        dict = event.get_dict()
        body = dict.get("content", {}).get("body", "")
        assert isinstance(body, str)
        try:
            # Attempt to deserialize as JSON.
            deserialized: dict = json.loads(body)
            code = deserialized.get("code", "NOT_SPAM")
            if code == "NOT_SPAM":
                return "NOT_SPAM"
            # Normalize to a `Codes`
            code = synapse.api.errors.Codes(code)
            return code
        except Exception as e:
            return "NOT_SPAM"

