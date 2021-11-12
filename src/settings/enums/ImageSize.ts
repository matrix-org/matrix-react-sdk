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
const SIZE_LARGE = { w: 480, h: 360 };
const SIZE_NORMAL = { w: 324, h: 220 };

export enum ImageSize {
    Normal = "normal",
    Large = "large",
}

export function suggestedSize(size: ImageSize): { w: number, h: number } {
    switch (size) {
        case ImageSize.Large:
            return SIZE_LARGE;
        case ImageSize.Normal:
        default:
            return SIZE_NORMAL;
    }
}
