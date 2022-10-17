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

import * as React from "react";
import { MatrixClient } from "matrix-js-sdk/src/matrix";
import classNames from "classnames";

import Modal, { IModal } from "../../Modal";
import { useEventEmitterState } from "../../hooks/useEventEmitter";
import { UPDATE_EVENT } from "../../stores/AsyncStore";
import MatrixClientContext from "../../contexts/MatrixClientContext";

interface IProps {
    matrixClient?: MatrixClient;
}

function onActiveModalClick(this: IModal<any>, ev: MouseEvent): void {
    const target = ev.target as HTMLElement;
    if (target.tagName === "DIALOG" && target.classList.contains("mx_Dialog_wrapper")) {
        // we want to pass a reason to the onBeforeClose
        // callback, but close is currently defined to
        // pass all number of arguments to the onFinished callback
        // so, pass the reason to close through a member variable
        this.closeReason = "backgroundClick";
        this.close();
        this.closeReason = null;
    }
}

function onActiveModalRender(this: IModal<any>, onTop: boolean, elem: HTMLDialogElement): void {
    if (!elem || this.hidden || elem.open) return;
    elem.oncancel = this.close;

    if (onTop) {
        elem.showModal();
    } else {
        elem.show();
    }
}

const ModalContainer: React.FC<IProps> = ({ matrixClient }) => {
    const modals = useEventEmitterState(Modal, UPDATE_EVENT, () => Modal.getModals());
    const firstVisible = modals.find(m => !m.hidden);
    return <MatrixClientContext.Provider value={matrixClient}>
        { modals.map(m => (
            <dialog
                key={m.id}
                className={classNames("mx_Dialog_wrapper", m.className)}
                onClick={m === firstVisible ? onActiveModalClick.bind(m) : undefined}
                ref={onActiveModalRender.bind(m, m === firstVisible)}
            >
                <div className="mx_Dialog">
                    { m.elem }
                </div>
            </dialog>
        )) }
    </MatrixClientContext.Provider>;
};

export default ModalContainer;
