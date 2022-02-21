/*
Copyright 2018 New Vector Ltd

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

import React from 'react';

import MImageBody from './MImageBody';
import { replaceableComponent } from "../../../utils/replaceableComponent";
import { BLURHASH_FIELD } from "../../../ContentMessages";
import { IMediaEventContent } from '../../../customisations/models/IMediaEventContent';
import SettingsStore from '../../../settings/SettingsStore';

const FORCED_IMAGE_HEIGHT = 20;

@replaceableComponent("views.messages.ReactionImage")
export default class ReactionImage extends MImageBody {
    public onClick = (ev: React.MouseEvent): void => {
        ev.preventDefault();
    };

    protected wrapImage(contentUrl: string, children: JSX.Element): JSX.Element {
        return children;
    }

    protected getPlaceholder(width: number, height: number): JSX.Element {
        if (this.props.mxEvent.getContent().info?.[BLURHASH_FIELD]) return super.getPlaceholder(width, height);
        return <img src={require("../../../../res/img/icons-show-stickers.svg")} width="14" height="20" />;
    }

    // Tooltip to show on mouse over
    protected getTooltip(): JSX.Element {
        return null;
    }

    // Don't show "Download this_file.png ..."
    protected getFileBody() {
        return null;
    }

    render() {
        const contentUrl = this.getContentUrl();
        const content = this.props.mxEvent.getContent<IMediaEventContent>();
        let thumbUrl;
        if (this.props.forExport || (this.isGif() && SettingsStore.getValue("autoplayGifs"))) {
            thumbUrl = contentUrl;
        } else {
            thumbUrl = this.getThumbUrl();
        }
        const thumbnail = this.messageContent(contentUrl, thumbUrl, content, FORCED_IMAGE_HEIGHT);
        return thumbnail;
    }
}
