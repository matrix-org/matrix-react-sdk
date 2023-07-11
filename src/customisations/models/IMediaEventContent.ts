/*
 * Copyright 2021 The Matrix.org Foundation C.I.C.
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

// TODO: These types should be elsewhere.

import { MsgType } from "matrix-js-sdk/src/matrix";

import { BLURHASH_FIELD } from "../../utils/image-media";

export interface IEncryptedFile {
    url: string;
    key: {
        alg: string;
        key_ops: string[]; // eslint-disable-line camelcase
        kty: string;
        k: string;
        ext: boolean;
    };
    iv: string;
    hashes: { [alg: string]: string };
    v: string;
}

interface ThumbnailInfo {
    mimetype?: string;
    w?: number;
    h?: number;
    size?: number;
}

interface BaseInfo {
    mimetype?: string;
    size?: number;
}

export interface FileInfo extends BaseInfo {
    [BLURHASH_FIELD]?: string;
    thumbnail_file?: IEncryptedFile;
    thumbnail_info?: ThumbnailInfo;
    thumbnail_url?: string;
}

export interface ImageInfo extends FileInfo, ThumbnailInfo {}

export interface AudioInfo extends BaseInfo {
    duration?: number;
}

export interface VideoInfo extends AudioInfo, ImageInfo {}

export type IMediaEventInfo = FileInfo | ImageInfo | AudioInfo | VideoInfo;

interface BaseContent {
    body: string;
}

interface BaseFileContent extends BaseContent {
    file?: IEncryptedFile;
    url?: string;
}

export interface FileContent extends BaseFileContent {
    filename?: string;
    info?: FileInfo;
    msgtype: MsgType.File;
}

export interface ImageContent extends BaseFileContent {
    info?: ImageInfo;
    msgtype: MsgType.Image;
}

export interface AudioContent extends BaseFileContent {
    info?: AudioInfo;
    msgtype: MsgType.Audio;
}

export interface VideoContent extends BaseFileContent {
    info?: VideoInfo;
    msgtype: MsgType.Video;
}

export type IMediaEventContent = FileContent | ImageContent | AudioContent | VideoContent;

export interface IPreparedMedia extends IMediaObject {
    thumbnail?: IMediaObject;
}

export interface IMediaObject {
    mxc: string;
    file?: IEncryptedFile;
}

/**
 * Parses an event content body into a prepared media object. This prepared media object
 * can be used with other functions to manipulate the media.
 * @param {IMediaEventContent} content Unredacted media event content. See interface.
 * @returns {IPreparedMedia} A prepared media object.
 * @throws Throws if the given content cannot be packaged into a prepared media object.
 */
export function prepEventContentAsMedia(content: Partial<IMediaEventContent>): IPreparedMedia {
    let thumbnail: IMediaObject | undefined;
    if (typeof content?.info === "object" && "thumbnail_url" in content.info && content.info.thumbnail_url) {
        thumbnail = {
            mxc: content.info.thumbnail_url,
            file: content.info.thumbnail_file,
        };
    } else if (
        typeof content?.info === "object" &&
        "thumbnail_file" in content.info &&
        typeof content?.info?.thumbnail_file === "object" &&
        content?.info?.thumbnail_file?.url
    ) {
        thumbnail = {
            mxc: content.info.thumbnail_file.url,
            file: content.info.thumbnail_file,
        };
    }

    if (content?.url) {
        return {
            thumbnail,
            mxc: content.url,
            file: content.file,
        };
    } else if (content?.file?.url) {
        return {
            thumbnail,
            mxc: content.file.url,
            file: content.file,
        };
    }

    throw new Error("Invalid file provided: cannot determine MXC URI. Has it been redacted?");
}
