/*
Copyright 2015, 2016 OpenMarket Ltd
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

import React from 'react';
import ReactDOM from 'react-dom';
import classNames from 'classnames';
import { defer, sleep } from "matrix-js-sdk/src/utils";

import AsyncWrapper from './AsyncWrapper';

const DIALOG_CONTAINER_ID = "mx_Dialog_Container";

export interface IModal<T extends any[]> {
    id: number;
    elem: React.ReactNode;
    className?: string;
    beforeClosePromise?: Promise<boolean>;
    closeReason?: string;
    onBeforeClose?(reason?: string): Promise<boolean>;
    onFinished(...args: T): void;
    close(...args: T): void;
    hidden?: boolean;
}

export interface IHandle<T extends any[]> {
    finished: Promise<T>;
    close(...args: T): void;
}

interface IProps<T extends any[]> {
    onFinished?(...args: T): void;
    // TODO improve typing here once all Modals are TS and we can exhaustively check the props
    [key: string]: any;
}

interface IOptions<T extends any[]> {
    onBeforeClose?: IModal<T>["onBeforeClose"];
}

type ParametersWithoutFirst<T extends (...args: any) => any> = T extends (a: any, ...args: infer P) => any ? P : never;

export class ModalManager {
    private counter = 0;
    // The modal to prioritise over all others. If this is set, only show
    // this modal. Remove all other modals from the stack when this modal
    // is closed.
    private priorityModal: IModal<any> = null;
    // The modal to keep open underneath other modals if possible. Useful
    // for cases like Settings where the modal should remain open while the
    // user is prompted for more information/errors.
    private staticModal: IModal<any> = null;
    // A list of the modals we have stacked up, with the most recent at [0]
    // Neither the static nor priority modal will be in this list.
    private modals: IModal<any>[] = [];

    private static getOrCreateContainer() {
        let container = document.getElementById(DIALOG_CONTAINER_ID);

        if (!container) {
            container = document.createElement("div");
            container.id = DIALOG_CONTAINER_ID;
            document.body.appendChild(container);
        }

        return container;
    }

    public hasDialogs(): boolean {
        return !!this.priorityModal || !!this.staticModal || this.modals.length > 0;
    }

    public createDialog<T extends any[]>(
        Element: React.ComponentType,
        ...rest: ParametersWithoutFirst<ModalManager["createDialogAsync"]>
    ) {
        return this.createDialogAsync<T>(Promise.resolve(Element), ...rest);
    }

    public appendDialog<T extends any[]>(
        Element: React.ComponentType,
        ...rest: ParametersWithoutFirst<ModalManager["appendDialogAsync"]>
    ) {
        return this.appendDialogAsync<T>(Promise.resolve(Element), ...rest);
    }

    public closeCurrentModal(reason: string) {
        const [modal] = this.getModals();
        if (!modal) return;
        modal.closeReason = reason;
        modal.close();
    }

    private buildModal<T extends any[]>(
        prom: Promise<React.ComponentType>,
        props?: IProps<T>,
        className?: string,
        options?: IOptions<T>,
    ) {
        const modal: IModal<T> = {
            id: this.counter++,
            onFinished: props ? props.onFinished : null,
            onBeforeClose: options.onBeforeClose,
            beforeClosePromise: null,
            closeReason: null,
            className,

            // these will be set below but we need an object reference to pass to getCloseFn before we can do that
            elem: null,
            close: null,
        };

        const setModalHidden = () => {
            modal.hidden = !modal.hidden;
            this.reRender();
        };

        // never call this from onFinished() otherwise it will loop
        const [closeDialog, onFinishedProm] = this.getCloseFn<T>(modal, props);

        // FIXME: If a dialog uses getDefaultProps it clobbers the onFinished
        // property set here so you can't close the dialog from a button click!
        modal.elem = (
            <AsyncWrapper
                key={modal.id}
                prom={prom}
                {...props}
                onFinished={closeDialog}
                setModalHidden={setModalHidden}
            />
        );
        modal.close = closeDialog;

        return { modal, closeDialog, onFinishedProm };
    }

    private getCloseFn<T extends any[]>(
        modal: IModal<T>,
        props: IProps<T>,
    ): [IHandle<T>["close"], IHandle<T>["finished"]] {
        const deferred = defer<T>();
        return [async (...args: T) => {
            if (modal.beforeClosePromise) {
                await modal.beforeClosePromise;
            } else if (modal.onBeforeClose) {
                modal.beforeClosePromise = modal.onBeforeClose(modal.closeReason);
                const shouldClose = await modal.beforeClosePromise;
                modal.beforeClosePromise = null;
                if (!shouldClose) {
                    return;
                }
            }
            deferred.resolve(args);
            props?.onFinished?.apply(null, args);
            const i = this.modals.indexOf(modal);
            if (i >= 0) {
                this.modals.splice(i, 1);
            }

            if (this.priorityModal === modal) {
                this.priorityModal = null;

                // XXX: This is destructive
                this.modals = [];
            }

            if (this.staticModal === modal) {
                this.staticModal = null;

                // XXX: This is destructive
                this.modals = [];
            }

            this.reRender();
        }, deferred.promise];
    }

    /**
     * @callback onBeforeClose
     * @param {string?} reason either "backgroundClick" or null
     * @return {Promise<bool>} whether the dialog should close
     */

    /**
     * Open a modal view.
     *
     * This can be used to display a React component which is loaded as an asynchronous
     * webpack component. To do this, set 'loader' as:
     *
     *   (cb) => {
     *       require(['<module>'], cb);
     *   }
     *
     * @param {Promise} prom   a promise which resolves with a React component
     *   which will be displayed as the modal view.
     *
     * @param {Object} props   properties to pass to the displayed
     *    component. (We will also pass an 'onFinished' property.)
     *
     * @param {String} className   CSS class to apply to the modal wrapper
     *
     * @param {boolean} isPriorityModal if true, this modal will be displayed regardless
     *                                  of other modals that are currently in the stack.
     *                                  Also, when closed, all modals will be removed
     *                                  from the stack.
     * @param {boolean} isStaticModal  if true, this modal will be displayed under other
     *                                 modals in the stack. When closed, all modals will
     *                                 also be removed from the stack. This is not compatible
     *                                 with being a priority modal. Only one modal can be
     *                                 static at a time.
     * @param {Object} options? extra options for the dialog
     * @param {onBeforeClose} options.onBeforeClose a callback to decide whether to close the dialog
     * @returns {object} Object with 'close' parameter being a function that will close the dialog
     */
    public createDialogAsync<T extends any[]>(
        prom: Promise<React.ComponentType>,
        props?: IProps<T>,
        className?: string,
        isPriorityModal = false,
        isStaticModal = false,
        options: IOptions<T> = {},
    ): IHandle<T> {
        const { modal, closeDialog, onFinishedProm } = this.buildModal<T>(prom, props, className, options);
        if (isPriorityModal) {
            // XXX: This is destructive
            this.priorityModal = modal;
        } else if (isStaticModal) {
            // This is intentionally destructive
            this.staticModal = modal;
        } else {
            this.modals.unshift(modal);
        }

        this.reRender();
        return {
            close: closeDialog,
            finished: onFinishedProm,
        };
    }

    private appendDialogAsync<T extends any[]>(
        prom: Promise<React.ComponentType>,
        props?: IProps<T>,
        className?: string,
    ): IHandle<T> {
        const { modal, closeDialog, onFinishedProm } = this.buildModal<T>(prom, props, className, {});

        this.modals.push(modal);
        this.reRender();
        return {
            close: closeDialog,
            finished: onFinishedProm,
        };
    }

    private getModals(): IModal<any>[] {
        return [
            this.priorityModal,
            ...this.modals,
            this.staticModal,
        ].filter(Boolean);
    }

    private onActiveModalClick(this: IModal<any>, ev: MouseEvent): void {
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

    private onActiveModalRender(this: IModal<any>, elem: HTMLDialogElement): void {
        if (!elem || elem.open) return;
        elem.oncancel = this.close;
        elem.showModal();
    }

    private async reRender() {
        // await next tick because sometimes ReactDOM can race with itself and cause the modal to wrongly stick around
        await sleep(0);

        const modals = this.getModals();
        if (modals.length === 0) {
            ReactDOM.unmountComponentAtNode(ModalManager.getOrCreateContainer());
            return;
        }

        const firstVisible = modals.find(m => !m.hidden);
        setImmediate(() => ReactDOM.render(<>
            { modals.map(m => (
                <dialog
                    key={m.id}
                    className={classNames("mx_Dialog_wrapper", m.className)}
                    onClick={m === firstVisible ? this.onActiveModalClick.bind(m) : undefined}
                    ref={m === firstVisible ? this.onActiveModalRender.bind(m) : undefined}
                >
                    <div className="mx_Dialog">
                        { m.elem }
                    </div>
                </dialog>
            )) }
        </>, ModalManager.getOrCreateContainer()));
    }
}

if (!window.singletonModalManager) {
    window.singletonModalManager = new ModalManager();
}
export default window.singletonModalManager;
