Olm
===

Note: before using any of the olm functions, you must call `Olm.init()`, and
wait for the promise to resolve, otherwise you will get errors like:
`Uncaught TypeError: Olm.Account is not a constructor`

If you get errors about failure to compile the wasm file, it is likely that Olm
is not locating the wasm file properly.  You can tell Olm where the wasm file
is by passing a `locateFile` parameter to `Olm.init()`, for example:
`Olm.init({locateFile: () => pathToWasmFile})`.

Example:

    var alice = new Olm.Account();
    var bob = new Olm.Account();
    alice.create();
    bob.create();
    bob.generate_one_time_keys(1);

    var bobs_id_keys = JSON.parse(bob.identity_keys());
    var bobs_id_key = bobs_id_keys.curve25519;
    var bobs_ot_keys = JSON.parse(bob.one_time_keys());
    for (key in bobs_ot_keys.curve25519) {
        var bobs_ot_key = bobs_ot_keys.curve25519[key];
    }

    alice_session = new Olm.Session();
    alice_session.create_outbound(alice, bobs_id_key, bobs_ot_key);
    alice_message = a_session.encrypt("Hello");

    bob_session.create_inbound(bob, bob_message);
    var plaintext = bob_session.decrypt(message_1.type, bob_message);
    bob.remove_one_time_keys(bob_session);


Group chat:

    var outbound_session = new Olm.OutboundGroupSession();
    outbound_session.create();

    // exchange these over a secure channel
    var session_id = group_session.session_id();
    var session_key = group_session.session_key();
    var message_index = group_session.message_index();

    var inbound_session = new Olm.InboundGroupSession();
    inbound_session.create(message_index, session_key);

    var ciphertext = outbound_session.encrypt("Hello");
    var plaintext = inbound_session.decrypt(ciphertext);
