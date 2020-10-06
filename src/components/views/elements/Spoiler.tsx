/*
 Copyright 2019 Sorunome

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

interface IProps {
    /** The reason the spoiler has been used. */
    reason?: string;

    /** The content, in HTML, to hide behind the spoiler. */
    contentHtml: string;
}

export default function Spinner(props: IProps) {
    const [visible, setVisible] = React.useState(false);

    function toggleVisible(event: React.MouseEvent) {
        if (visible) {
            event.preventDefault();
            event.stopPropagation();
        }

        setVisible(!visible);
    }

    const reason = props.reason ?
        <span className="mx_EventTile_spoiler_reason">{"(" + props.reason + ")"}</span> : null;

    // React doesn't allow appending a DOM node as child.
    // as such, we pass the this.props.contentHtml instead and then set the raw
    // HTML content. This is secure as the contents have already been parsed previously.
    return (
        <span className={"mx_EventTile_spoiler" + (visible ? " visible" : "")} onClick={toggleVisible}>
            { reason }
            &nbsp;
            <span className="mx_EventTile_spoiler_content" dangerouslySetInnerHTML={{ __html: props.contentHtml }} />
        </span>
    );
}
