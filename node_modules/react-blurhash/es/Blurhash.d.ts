import * as React from 'react';
declare type Props = React.HTMLAttributes<HTMLDivElement> & {
    hash: string;
    /** CSS height, default: 128 */
    height?: number | string | 'auto';
    punch?: number;
    resolutionX?: number;
    resolutionY?: number;
    style?: React.CSSProperties;
    /** CSS width, default: 128 */
    width?: number | string | 'auto';
};
export default class Blurhash extends React.PureComponent<Props> {
    static defaultProps: {
        height: number;
        width: number;
        resolutionX: number;
        resolutionY: number;
    };
    componentDidUpdate(): void;
    render(): JSX.Element;
}
export {};
