import React from "react";
import { replaceableComponent } from "../../../utils/replaceableComponent";

interface IProps {
	url: string;
    onClick(): void;
}

interface IState {
}

@replaceableComponent("views.gifpicker.GifThumbnail")
export default class GifThumbnail extends React.Component<IProps, IState> {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div onClick={this.props.onClick} className="mx_GifPicker_thumbnail">
				<img src={this.props.url}></img>
            </div>
        );
    }
}
