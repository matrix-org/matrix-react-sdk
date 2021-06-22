/*
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

import React, {useEffect, useRef, useState, FunctionComponent} from "react";
import Spinner from "./Spinner";

/*
 * A component which measures its children, and places a spinner over them
 * while 'active' is true.
 * We use 'holdOff' and 'holdOver' to shift the animations in time:
 * We don't animate instantly to avoid a quick 'ghost' spinner for fast round trips.
 * We have a short holdOver to allow the fade out to occur.
 */

interface IProps {
    active: boolean,
    className?: string,
}

export const OverlaySpinner: FunctionComponent<IProps> = ({active, className, children}) => {
    const measured = useRef(null);
    const [state, setState] = useState({w: 0, h: 0});

    const firstMount = useRef(true);
    const [holdOver, setHoldOver] = useState(false);
    const [holdOff, setHoldOff] = useState(false);

    /* Follow the size of the element we're meant to cover */
    useEffect(() => {
        const interval = requestAnimationFrame(() => {
            if (!measured.current) return;
            setState({
                w: measured.current.clientWidth,
                h: measured.current.clientHeight,
            });
        });
        return () => cancelAnimationFrame(interval);
    });

    /* If it's not the first mount and the state changes to inactive,
     * set 'holdOver' to true so the exit animation can play */
    useEffect(() => {
        if (firstMount.current) {
            firstMount.current = false;
            return;
        }
        if (!active) {
            const handle = setTimeout(setHoldOver, 200, false);
            setHoldOver(true);
            return () => {
                setHoldOver(false);
                clearTimeout(handle);
            };
        } else {
            const handle = setTimeout(setHoldOff, 200, false);
            setHoldOff(true);
            return () => {
                setHoldOff(false);
                clearTimeout(handle);
            };
        }
    }, [active]);

    const visibility = !holdOff && active ? "visible" : "hidden";

    return (<div className={className} style={{ position: "relative" }}>
        <div className={`mx_OverlaySpinner mx_OverlaySpinner_${visibility}`} style={{
            position: "absolute",
            width: state.w,
            height: state.h,
            visibility: active || holdOver ? "visible" : "hidden",
        }}><Spinner /></div>
        <div ref={measured}>
            {children}
        </div>
    </div>);
}

export default OverlaySpinner;
