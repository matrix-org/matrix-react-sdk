/*
Copyright 2024 The Matrix.org Foundation C.I.C.

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

import React, {useEffect} from "react";

import {canAddAuthToMediaUrl, getMediaByUrl} from "../../../utils/media";

interface IProps extends React.HTMLProps<HTMLImageElement> {
}

const AuthedImage: React.FC<IProps> = (props) => {
    const [src, setSrc] = React.useState<string | undefined>("");

    useEffect(() => {
        let blobUrl: string | undefined;
        async function getImage(): Promise<void> {
            if (props.src) {
                if (await canAddAuthToMediaUrl(props.src)) {
                    const response = await getMediaByUrl(props.src);
                    blobUrl = URL.createObjectURL(await response.blob());
                    setSrc(blobUrl);
                } else {
                    // Skip blob caching if we're just doing a plain http(s) request.
                    setSrc(props.src);
                }
            }
        }

        // noinspection JSIgnoredPromiseFromCall
        getImage();

        return () => {
            // Cleanup
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [props.src]);

    const props2 = {...props};
    props2.src = src;

    return (
        // eslint-disable-next-line jsx-a11y/alt-text
        <img {...props2} />
    );
};

export default AuthedImage;
