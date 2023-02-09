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

import * as React from "react";

interface IProps {
    // A callback for the selected value
    onSelectionChange: (value: number) => void;

    // The current value of the slider
    value: number;

    // The range and values of the slider
    // Currently only supports an ascending, constant interval range
    values: number[];

    // A function for formatting the the values
    displayFunc: (value: number) => string;

    // Whether the slider is disabled
    disabled: boolean;
}

export default class Slider extends React.Component<IProps> {
    // state to keep track of the current index and percent
    state = {
        index: this.props.values.indexOf(this.props.value),
        percent: this.offset(this.props.values, this.props.value),
    };

    // offset is a terrible inverse approximation.
    // if the values represents some function f(x) = y where x is the
    // index of the array and y = values[x] then offset(f, y) = x
    // s.t f(x) = y.
    // it assumes a monotonic function and interpolates linearly between
    // y values.
    // Offset is used for finding the location of a value on a
    // non linear slider.
    private offset(values: number[], value: number): number {
        // the index of the first number greater than value.
        const closest = values.reduce((prev, curr) => {
            return value > curr ? prev + 1 : prev;
        }, 0);

        // Off the left
        if (closest === 0) {
            return 0;
        }

        // Off the right
        if (closest === values.length) {
            return 100;
        }

        // Now
        const closestLessValue = values[closest - 1];
        const closestGreaterValue = values[closest];

        const intervalWidth = 1 / (values.length - 1);

        const linearInterpolation = (value - closestLessValue) / (closestGreaterValue - closestLessValue);

        return 100 * (closest - 1 + linearInterpolation) * intervalWidth;
    }

    public render(): React.ReactNode {
        const dots = this.props.values.map((v) => (
            <Dot
                active={v <= this.props.value}
                label={this.props.displayFunc(v)}
                onClick={this.props.disabled ? () => {} : () => this.props.onSelectionChange(v)}
                key={v}
                disabled={this.props.disabled}
            />
        ));

        let selection = null;

        const onDrag = (e: React.DragEvent) => {
            //  console.log(e.target.parentNode.parentNode)

            const target = e.target as HTMLElement;
            if (!target.parentNode) return null;
            const parent = target.parentNode as HTMLElement;
            if (!parent.parentNode) return null;
            const slider = parent.parentNode as HTMLElement;
            const rect = slider.getBoundingClientRect();

            const x = e.clientX - rect.left; //x position within the element.
            const width = rect.width;
            const percent = x / width;
            const value = Math.round(percent * (this.props.values.length - 1));
            this.setState({ index: value, percent: percent * 100 });

            //put the inner dot to the correct position
            const innerDot = target.parentNode as any;
            if (!innerDot) return null;
            // innerDot.style.left = `${this.state.percent}%`;
            const offset = this.offset(this.props.values, this.props.values[value]);
            innerDot.style.left = `calc(-1.195em + " + ${offset} + "%)`;

        };

        const onDragEnd = (e: any) => {
            const innerDot = e.target.parentNode;
            const target = e.target as HTMLElement;
            if (!target.parentNode) return null;
            const parent = target.parentNode as HTMLElement;
            if (!parent.parentNode) return null;
            const slider = parent.parentNode as HTMLElement;
            const rect = slider.getBoundingClientRect();
            const x = e.clientX - rect.left; //x position within the element.
            // console.log(x);
            if(x < -10 || x > rect.width + 10)  return null;
            const width = rect.width;

            const percent = x / width;
            const value = Math.round(percent * (this.props.values.length - 1));
            const offset = this.offset(this.props.values, this.props.values[value]);
            innerDot.style.left = `calc(-1.195em + " + ${offset} + "%)`;
            this.props.onSelectionChange(this.props.values[value]);
        };

        if (!this.props.disabled) {
            const offset = this.offset(this.props.values, this.props.value);
            selection = (
                <div className="mx_Slider_selection">
                    <div className="mx_Slider_selectionDot" style={{ left: "calc(-1.195em + " + offset + "%)" }}>
                        <div
                            onDrag={onDrag}
                            onDragEnd={onDragEnd}
                            draggable={true}
                            className="mx_Slider_selectionDotInner"
                        ></div>
                        <div className="mx_Slider_selectionText">{this.props.value}</div>
                    </div>
                    <hr style={{ width: offset + "%" }} />
                </div>
            );
        }

        //todo:
        //make a new element for dragging
        //immplement drag

        return (
            <div className="mx_Slider">
                <div>
                    <div className="mx_Slider_bar">
                        <hr onClick={this.props.disabled ? () => {} : this.onClick.bind(this)} />
                        {selection}
                    </div>
                    <div className="mx_Slider_dotContainer">{dots}</div>
                </div>
            </div>
        );
    }

    public onClick(event: React.MouseEvent): void {
        const width = (event.target as HTMLElement).clientWidth;
        // nativeEvent is safe to use because https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/offsetX
        // is supported by all modern browsers
        const relativeClick = event.nativeEvent.offsetX / width;
        const nearestValue = this.props.values[Math.round(relativeClick * (this.props.values.length - 1))];
        this.props.onSelectionChange(nearestValue);
    }
}

interface IDotProps {
    // Callback for behavior onclick
    onClick: () => void;

    // Whether the dot should appear active
    active: boolean;

    // The label on the dot
    label: string;

    // Whether the slider is disabled
    disabled: boolean;
}

class Dot extends React.PureComponent<IDotProps> {
    public render(): React.ReactNode {
        let className = "mx_Slider_dot";
        if (!this.props.disabled && this.props.active) {
            className += " mx_Slider_dotActive";
        }

        return (
            <span onClick={this.props.onClick} className="mx_Slider_dotValue">
                <div className={className} />
                <div className="mx_Slider_labelContainer">
                    <div className="mx_Slider_label">{this.props.label}</div>
                </div>
            </span>
        );
    }
}
