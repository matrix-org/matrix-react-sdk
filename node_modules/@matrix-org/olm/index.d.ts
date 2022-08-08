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

export as namespace Olm;

declare class Account {
    constructor();
    free();
    create();
    identity_keys(): string;
    sign(message: string | Uint8Array): string;
    one_time_keys(): string;
    mark_keys_as_published();
    max_number_of_one_time_keys(): number;
    generate_one_time_keys(number_of_keys: number);
    remove_one_time_keys(session: Session);
    generate_fallback_key();
    fallback_key(): string;
    unpublished_fallback_key(): string;
    forget_old_fallback_key(): void;
    pickle(key: string | Uint8Array): string;
    unpickle(key: string | Uint8Array, pickle: string);
}

declare class Session {
    constructor();
    free(): void;
    pickle(key: string | Uint8Array): string;
    unpickle(key: string | Uint8Array, pickle: string);
    create_outbound(
        account: Account, their_identity_key: string, their_one_time_key: string,
    ): void;
    create_inbound(account: Account, one_time_key_message: string): void;
    create_inbound_from(
        account: Account, identity_key: string, one_time_key_message: string,
    ): void;
    session_id(): string;
    has_received_message(): boolean;
    matches_inbound(one_time_key_message: string): boolean;
    matches_inbound_from(identity_key: string, one_time_key_message: string): boolean;
    encrypt(plaintext: string): object;
    decrypt(message_type: number, message: string): string;
    describe(): string;
}

declare class Utility {
    constructor();
    free(): void;
    sha256(input: string | Uint8Array): string;
    ed25519_verify(key: string, message: string | Uint8Array, signature: string): void;
}

declare class InboundGroupSession {
    constructor();
    free(): void;
    pickle(key: string | Uint8Array): string;
    unpickle(key: string | Uint8Array, pickle: string);
    create(session_key: string): string;
    import_session(session_key: string): string;
    decrypt(message: string): object;
    session_id(): string;
    first_known_index(): number;
    export_session(message_index: number): string;
}

declare class OutboundGroupSession {
    constructor();
    free(): void;
    pickle(key: string | Uint8Array): string;
    unpickle(key: string | Uint8Array, pickle: string);
    create(): void;
    encrypt(plaintext: string): string;
    session_id(): string;
    session_key(): string;
    message_index(): number;
}

declare class PkEncryption {
    constructor();
    free(): void;
    set_recipient_key(key: string): void;
    encrypt(plaintext: string): object;
}

declare class PkDecryption {
    constructor();
    free(): void;
    init_with_private_key(key: Uint8Array): string;
    generate_key(): string;
    get_private_key(): Uint8Array;
    pickle(key: string | Uint8Array): string;
    unpickle(key: string | Uint8Array, pickle: string): string;
    decrypt(ephemeral_key: string, mac: string, ciphertext: string): string;
}

declare class PkSigning {
    constructor();
    free(): void;
    init_with_seed(seed: Uint8Array): string;
    generate_seed(): Uint8Array;
    sign(message: string): string;
}

declare class SAS {
    constructor();
    free(): void;
    get_pubkey(): string;
    set_their_key(their_key: string): void;
    generate_bytes(info: string, length: number): Uint8Array;
    calculate_mac(input: string, info: string): string;
    calculate_mac_long_kdf(input: string, info: string): string;
}

export function init(opts?: object): Promise<void>;

export function get_library_version(): [number, number, number];

export const PRIVATE_KEY_LENGTH: number;
