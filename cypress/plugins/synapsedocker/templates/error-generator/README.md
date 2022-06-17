# A Synapse instance for testing account suspension, as per MSC3823

Use this Synapse instance whenever you wish to simulate errors received
from the server on reaction to sending a message.

To have your message rejected with a Matrix error `M_FORBIDDEN`,
send a text message with body `{ "errcode": "M_FORBIDDEN"}`. This
works with any standard Matrix error.
