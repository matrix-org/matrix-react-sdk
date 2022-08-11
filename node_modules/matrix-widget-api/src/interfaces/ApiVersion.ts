/*
 * Copyright 2020 The Matrix.org Foundation C.I.C.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export enum MatrixApiVersion {
    Prerelease1 = "0.0.1",
    Prerelease2 = "0.0.2",
    //V010 = "0.1.0", // first release
}

export enum UnstableApiVersion {
    MSC2762 = "org.matrix.msc2762",
    MSC2871 = "org.matrix.msc2871",
    MSC2931 = "org.matrix.msc2931",
    MSC2974 = "org.matrix.msc2974",
    MSC2876 = "org.matrix.msc2876",
    MSC3819 = "org.matrix.msc3819",
    MSC3846 = "town.robin.msc3846",
}

export type ApiVersion = MatrixApiVersion | UnstableApiVersion | string;

export const CurrentApiVersions: ApiVersion[] = [
    MatrixApiVersion.Prerelease1,
    MatrixApiVersion.Prerelease2,
    //MatrixApiVersion.V010,
    UnstableApiVersion.MSC2762,
    UnstableApiVersion.MSC2871,
    UnstableApiVersion.MSC2931,
    UnstableApiVersion.MSC2974,
    UnstableApiVersion.MSC2876,
    UnstableApiVersion.MSC3819,
    UnstableApiVersion.MSC3846,
];
