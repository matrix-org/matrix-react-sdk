import * as React from 'react';
export declare type Props = React.CanvasHTMLAttributes<HTMLCanvasElement> & {
    hash: string;
    height?: number;
    punch?: number;
    width?: number;
};
export default class BlurhashCanvas extends React.PureComponent<Props> {
    static defaultProps: {
        height: number;
        width: number;
    };
    canvas: HTMLCanvasElement;
    componentDidUpdate(): void;
    handleRef: (canvas: HTMLCanvasElement) => void;
    draw: () => void;
    render(): JSX.Element;
}
