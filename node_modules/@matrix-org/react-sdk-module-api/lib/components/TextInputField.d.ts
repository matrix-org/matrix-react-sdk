import * as React from "react";
export interface TextInputFieldProps {
    label: string;
    value: string;
    onChange: (newValue: string) => void;
}
export declare class TextInputField extends React.PureComponent<TextInputFieldProps> {
    /**
     * The factory this component uses to render itself. Set to a different value to override.
     * @param props The component properties
     * @returns The component, rendered.
     */
    static renderFactory: (props: TextInputFieldProps) => React.ReactNode;
    render(): React.ReactNode;
}
