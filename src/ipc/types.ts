/*
Copyright 2022 The Matrix.org Foundation C.I.C.

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

export enum Op {
    Ident = "IDENT",
    Welcome = "WELCOME",
    BeginElect = "BEGIN_ELECT",
    Vote = "VOTE",
    Elected = "ELECTED",
    RefreshToken = "REFRESH_TOKEN",
    AccessTokenUpdated = "ACCESS_TOKEN_UPDATED",
}

export interface IIdentPayload {}

export interface IWelcomePayload {
    leader: string;
}

export interface IBeginElectPayload {
    electionId: string;
    startTs: number;
    vote: string;
}

export interface IVotePayload {
    electionId: string;
    vote: string;
}

export interface IElectedPayload {
    electionId: string;
}

export interface IRefreshTokenPayload {}

export interface IAccessTokenRefreshedPayload {}

export type TOperation<O extends Op, T extends object = {}> = {
    operation: O;
    version: number;
    clientId: string;
    payload: T;
};

export type IdentOperation = TOperation<Op.Ident, IIdentPayload>;
export type WelcomeOperation = TOperation<Op.Welcome, IWelcomePayload>;
export type BeginElectOperation = TOperation<Op.BeginElect, IBeginElectPayload>;
export type VoteOperation = TOperation<Op.Vote, IVotePayload>;
export type ElectedOperation = TOperation<Op.Elected, IElectedPayload>;
export type RefreshAccessTokenOperation = TOperation<Op.RefreshToken, IRefreshTokenPayload>;
export type AccessTokenRefreshedOperation = TOperation<Op.AccessTokenUpdated, IAccessTokenRefreshedPayload>;

export type Operation =
    | IdentOperation
    | WelcomeOperation
    | BeginElectOperation
    | VoteOperation
    | ElectedOperation
    | RefreshAccessTokenOperation
    | AccessTokenRefreshedOperation
    ;
