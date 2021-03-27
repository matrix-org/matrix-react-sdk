import React from "react";
import { replaceableComponent } from "../../../utils/replaceableComponent";
import Search from "../emojipicker/Search";
import ScrollPanel from "../../structures/ScrollPanel";
import Spinner from "../elements/Spinner";
import GifThumbnail from "./GifThumbnail";
import { throttle } from "lodash";
import { Gif } from './Gif';

const API_KEY = "hhMBhTnD7k8BgyoZCM9UNM1vRsPcgzaC";

interface IProps {
    addGif(gif: Gif): void;
}

interface IState {
    filter: string;
    scrollTop: number;
    // initial estimation of height, dialog is hardcoded to 450px height.
    // should be enough to never have blank rows of emojis as
    // 3 rows of overflow are also rendered. The actual value is updated on scroll.
    viewportHeight: number;
    loading: boolean;
    gifs: Gif[];
}

@replaceableComponent("views.gifpicker.GifPicker")
export default class GifPicker extends React.Component<IProps, IState> {
    constructor(props) {
        super(props);

        this.state = {
            filter: "",
            scrollTop: 0,
            viewportHeight: 280,
            loading: false,
            gifs: [],
        };

        this.onChangeFilter = this.onChangeFilter.bind(this);
        this.onEnterFilter = this.onEnterFilter.bind(this);
        this.onFillRequest = this.onFillRequest.bind(this);
        this.searchGifs = this.searchGifs.bind(this);
        this.searchGifs = throttle(this.searchGifs, 1000);
    }

    async searchGifs(filter: string, offset: number) {
        if (!filter) {
            return [[], 0];
        }
        const response = await fetch(
            `https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(
                filter
            )}&api_key=${API_KEY}&limit=10&rating=g&offset=${offset}`
        );
        const content = await response.json();
        return [content.data, content.pagination.offset];
    }

    onChangeFilter(filter) {
        this.setState({ filter });
    }

    async onEnterFilter() {
        this.setState({ loading: true });
        const [gifs, offset] = await this.searchGifs(this.state.filter, 0);
        this.setState({ loading: false, gifs });
    }

    async onFillRequest(backwards) {
        if (backwards) {
            return false;
        }

        this.setState({ loading: true });
        const [newGifs, offset] = await this.searchGifs(
            this.state.filter,
            this.state.gifs.length
        );
        this.setState(({ gifs }) => ({
            loading: false,
            gifs: offset === gifs.length ? gifs.concat(newGifs) : gifs,
        }));
        return false;
    }

    render() {
        const initialNotice = (
            <div className="mx_GifPicker_initialNotice">
                Type to search GIFs
            </div>
        );

        return (
            <div className="mx_GifPicker">
                <Search
                    query={this.state.filter}
                    onChange={this.onChangeFilter}
                    onEnter={this.onEnterFilter}
                />
                {this.state.gifs.length === 0 && initialNotice}
                <ScrollPanel
                    className="mx_GifPicker_scrollPanel"
                    onFillRequest={this.onFillRequest}
                    stickyBottom={false}
                    startAtBottom={false}
                >
                    {this.state.gifs.map((gif) => (
                        <GifThumbnail
                            key={gif.id}
                            url={gif.images.fixed_width.url}
                            onClick={() => this.props.addGif(gif)}
                        />
                    ))}
                    {this.state.loading && <Spinner />}
                </ScrollPanel>
            </div>
        );
    }
}
