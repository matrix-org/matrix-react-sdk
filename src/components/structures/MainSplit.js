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
import ResizeHandle from '../views/elements/ResizeHandle';
import {Resizer, FixedDistributor} from '../../resizer';

export default class MainSplit extends React.Component {
    constructor(props) {
        super(props);
        this._setResizeContainerRef = this._setResizeContainerRef.bind(this);
        this._onResized = this._onResized.bind(this);
    }

    _onResized(size) {
        window.localStorage.setItem("mx_rhs_size", size);
    }

    _createResizer() {
        const classNames = {
            handle: "mx_ResizeHandle",
            vertical: "mx_ResizeHandle_vertical",
            reverse: "mx_ResizeHandle_reverse",
        };
        const resizer = new Resizer(
            this.resizeContainer,
            FixedDistributor,
            {onResized: this._onResized},
        );
        resizer.setClassNames(classNames);
        let rhsSize = window.localStorage.getItem("mx_rhs_size");
        if (rhsSize !== null) {
            rhsSize = parseInt(rhsSize, 10);
        } else {
            rhsSize = 350;
        }
        resizer.forHandleAt(0).resize(rhsSize);

        resizer.attach();
        this.resizer = resizer;
    }

    _setResizeContainerRef(div) {
        this.resizeContainer = div;
    }

    componentDidMount() {
        if (this.props.panel && !this.props.collapsedRhs) {
            this._createResizer();
        }
    }

    componentWillUnmount() {
        if (this.resizer) {
            this.resizer.detach();
            this.resizer = null;
        }
    }

    componentDidUpdate(prevProps) {
        const wasExpanded = !this.props.collapsedRhs && prevProps.collapsedRhs;
        const wasCollapsed = this.props.collapsedRhs && !prevProps.collapsedRhs;
        const wasPanelSet = this.props.panel && !prevProps.panel;
        const wasPanelCleared = !this.props.panel && prevProps.panel;

        if (wasExpanded || wasPanelSet) {
            this._createResizer();
        } else if (wasCollapsed || wasPanelCleared) {
            this.resizer.detach();
            this.resizer = null;
        }
    }

    render() {
        const bodyView = React.Children.only(this.props.children);
        const panelView = this.props.panel;

        if (this.props.collapsedRhs || !panelView) {
            return bodyView;
        } else {
            return <div className="mx_MainSplit" ref={this._setResizeContainerRef}>
                { bodyView }
                <ResizeHandle reverse={true} />
                { panelView }
            </div>;
        }
    }
}
