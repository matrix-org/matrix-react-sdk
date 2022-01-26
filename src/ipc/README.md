# Inter-process Communication for react-sdk

The IPC layer in the react-sdk is responsible for managing communications between
other running (and reachable) clients, primarily intending to determine leadership.
Reachable clients are intended to be ones which share the same storage, such as
tabs within a particular browser client, but not necessarily across application
boundaries (web can't talk to an installed desktop app).

Leadership among connected clients is primarily intended for use by features which
require an operation to happen exactly once.

A current example of such an operation is refreshing the access token: if an access
token is refreshed and the new token used followed by the refresh token being used
again then the server will consider the token compromised and log out both the old
and new access token, invalidating the refresh token too. This sort of scenario is
very possible with multiple clients (tabs) using the same access and refresh token
due to timing issues with JavaScript timers.

The IPC layer is split into two parts: communication and leadership (the protocol).

## Communications layer

This is the part where the application-specific IPC protocol is implemented. It is a
simple JSON-based protocol.

The communications go over the [Broadcast Channel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)
if supported, or localstorage in other cases. Noting that neither of these options are
inherently secure, the client should validate that it is receiving a correct shape over
the layer and that it does not transmit sensitive information like access tokens.

## Protocol

The protocol on top of the underlying transport is simply JSON objects with a `payload`
which is dependent on the provided operation.

```json5
{
    // The operation being executed. Enum value.
    "operation": "IDENT",

    // The version of the operation being used.
    "version": 1,

    // The client ID which is sending the operation. Must be treated
    // as opaque, and should be suitably random.
    "clientId": "opaque",

    // The operation's payload (operation dependent).
    "payload": {
        // ...
    }
}
```

### Leadership election

Some functionality in the client must be run exactly once, which means one client must be
declared leader. Tabs in particular are subject to random closure from the user, adding
complexity to the underlying protocol to handle dead clients.

The overall election process is quite simple: any client can start a vote, the vote happens,
and whichever client wins becomes leader. Other protocols like Raft and Paxos use a much more
complicated (but reliable) protocol to elect a long-lived leader, however given the nature of
the tabs in which we deal with it is less important for us to maintain the same leader through
multiple votes. That is to say, we accept high changeover as a feature rather than a bug.

To start a vote, the client sends the following:

```json5
{
    "operation": "BEGIN_ELECT",
    "version": 1,
    "clientId": "opaque",
    "payload": {
        // The ID of the election. Used for associating votes.
        "electionId": "opaque",

        // The timestamp the client is sending this. Used for detecting
        // delayed timers within backgrounded tabs.
        "startTs": 11234,

        // The starting client's vote (see next code block)
        "vote": "opaque"
    }
}
```

The other clients vote with:

```json5
{
    "operation": "VOTE",
    "version": 1,
    "clientId": "also_opaque",
    "payload": {
        // From the BEGIN_ELECT operation
        "electionId": "opaque",

        // The client's vote. This is an opaque, random, string which
        // will be compared to select a leader.
        "vote": "another_opaque"
    }
}
```

The client should cache the `vote` it used for 30 seconds, in the event that multiple votes
are ongoing it is important for them to all resolve to the same answer.

Only the first vote will be considered per election, however the cached vote should help
prevent this.

After all known clients (discussed later) have voted, or 10 seconds from `startTs`, the
election concludes with the lowest `vote` lexicographically winning leadership. If the vote
is tied, the lowest `clientId` lexicographically wins. The leader self-advertises its claim
with:

```json5
{
    "operation": "ELECTED",
    "version": 1,
    "clientId": "also_opaque",
    "payload": {
        // From the BEGIN_ELECT operation
        "electionId": "opaque"
    }
}
```

If there's a conflict in leadership, the whole vote is repeated by any client (the vote caching
should prevent conflicts with multiple clients starting a new vote). This re-election should
wait until the `vote` cache has sufficiently expired, however (about 45-60 seconds).

While a legitimate leader is not elected the previous leader remains in control. If no previous
leader exists, the client with the lowest `clientId` lexicographically is the leader.

The election with the highest `startTs` determines the current leader.

### Identifying connected clients

New clients will first `IDENT` to notify others that they have joined the party:

```json
{
    "operation": "IDENT",
    "version": 1,
    "clientId": "opaque",
    "payload": {}
}
```

The other clients then respond with the following:

```json5
{
    "operation": "WELCOME",
    "version": 1,
    "clientId": "also-opaque",
    "payload": {
        // The client ID which this client believes is the elected leader.
        // If there's conflict among the clients, a re-vote is held.
        // If no leader is known then this will be the client's own ID.
        "leader": "another-opaque"
    }
}
```

Clients should respond promptly as clients will generally wait at most 5 seconds for other
clients to `WELCOME` themselves.

Clients can broadcast `WELCOME` messages at any time to implicitly sanity check their leader
election. For example, after an election is held a client might `WELCOME` again to indicate
that they have changed leader - other clients should detect this and advertise accordingly.

Clients can additionally `IDENT` periodically to ping for other clients that might not have
joined properly.

### Conflict resolution and security

As mentioned previously, it's entirely possible for malicious clients to exist on the wire.
Ultimately  this will have user impact concerns and shouldn't take down the application
itself (ie: tokens due for refresh will expire if a malicious leader is elected). No sensitive
information should ever be shared with operations as it might be recorded by extensions,
malicious tabs, etc.

The leader election is designed to happen often and consistently: if multiple elections are
ongoing then the client will have cached its value for at least 30 seconds. There is additional
argument for that client to just generate a vote at startup and always use that (effectively a
client ID): this is possible, though not recommended as it can mean the randomness of election
doesn't take effect.

### Custom functionality: Access token refresh

Two operations are specified which handle the token refresh exchange. When a client believes it
needs a new token, it first determines if it is the current leader. If it is, it refreshes the
token and updates all other clients with `ACCESS_TOKEN_UPDATED`. If it is not the leader, it
broadcasts `REFRESH_TOKEN` to get the leader to refresh the token and cause the `ACCESS_TOKEN_UPDATED`
operation.

If the leader doesn't respond to `REFRESH_TOKEN` in a reasonable time frame (roughly double the
average HTTP timeout) then the client should assume the leader is dead and keep using its current
credentials. It can attempt to elect a new leader if it desires.

Both operations take no payload.

```json
{
    "operation": "REFRESH_TOKEN",
    "version": 1,
    "clientId": "opaque",
    "payload": {}
}
```
```json
{
    "operation": "ACCESS_TOKEN_UPDATED",
    "version": 1,
    "clientId": "opaque",
    "payload": {}
}
```

## Rationale for custom implementation

A notable library which does broadcast support (with fallback) is
[pubkey/broadcast-channel](https://github.com/pubkey/broadcast-channel), so why not use it?
Unfortunately it has the issue of occasionally electing multiple leaders, which is absolutely
not supposed to happen when we need to refresh the access token (for example) exactly once.

Other libraries appear to have similar issues.
