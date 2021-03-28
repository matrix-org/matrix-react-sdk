import React from "react";
import { replaceableComponent } from "../../../utils/replaceableComponent";
import { Gif } from './Gif';

interface IProps {
    gif: Gif;
    onClick(gif: Gif): void;
}

interface IState {
}

@replaceableComponent("views.gifpicker.GifThumbnail")
export default class GifThumbnail extends React.Component<IProps, IState> {
    constructor(props) {
        super(props);
    }

    render() {
        const gif = this.props.gif;
        const rendition = gif.images.fixed_width;
        return (
            <div onClick={() => this.props.onClick(gif)} className="mx_GifPicker_thumbnail">
                <video autoPlay loop muted playsInline width={rendition.width} height={rendition.height}>
                    <source src={rendition.mp4} type="video/mp4" />
                    Unsupported file type.
                </video>
            </div>
        );
    }
}
