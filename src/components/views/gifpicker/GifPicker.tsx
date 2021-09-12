/* eslint-disable camelcase */
import React from "react";
import { replaceableComponent } from "../../../utils/replaceableComponent";
import Search from "../emojipicker/Search";
import ScrollPanel from "../../structures/ScrollPanel";
import Spinner from "../elements/Spinner";
import GifThumbnail from "./GifThumbnail";
import { DebouncedFunc, throttle, uniqBy } from "lodash";
import { Gif } from "./Gif";

const API_KEY = "hhMBhTnD7k8BgyoZCM9UNM1vRsPcgzaC";

async function searchGifs(
    filter: string,
    offset: number,
): Promise<[Gif[], { offset: number, total_count: number }]> {
    if (!filter) {
        return [[], { offset: 0, total_count: 0 }];
    }
    const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(
            filter,
        )}&api_key=${API_KEY}&limit=5&rating=g&offset=${offset}`,
    );
    const content = await response.json();
    return [content.data, content.pagination];
}

function gifPaginator(filter): DebouncedFunc<() => Promise<Gif[]>> {
    let gifs = [];
    let depleted = false;
    return throttle(async () => {
        if (depleted) {
            return gifs;
        }
        const [newGifs, { total_count }] = await searchGifs(
            filter,
            gifs.length,
        );
        gifs = gifs.concat(newGifs);
        if (total_count === gifs.length) {
            depleted = true;
        }
        const uniqueGifs: Gif[] = uniqBy(gifs, "id");
        return uniqueGifs;
    }, 1000);
}

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
    paginator: DebouncedFunc<() => Promise<Gif[]>>;
    canceled = false;

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
        this.paginator = gifPaginator("");
    }

    onChangeFilter(filter: string) {
        this.paginator = gifPaginator(filter);
        this.setState({ filter, gifs: [] });
    }

    async onEnterFilter() {
        this.setState({ loading: true });

        const gifs = await this.paginator();
        if (this.canceled) return;

        this.setState({ loading: false, gifs });
    }

    async onFillRequest(backwards: boolean) {
        if (backwards || !this.state.filter || this.canceled) {
            return false;
        }

        this.setState({ loading: true });
        const gifs = await this.paginator();
        if (this.canceled) {
            return false;
        }
        this.setState({
            loading: false,
            gifs,
        });
        return false;
    }

    componentWillUnmount() {
        this.canceled = true;
        this.paginator.cancel();
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
                { this.state.gifs.length === 0 && initialNotice }
                <ScrollPanel
                    className="mx_GifPicker_scrollPanel"
                    onFillRequest={this.onFillRequest}
                    stickyBottom={false}
                    startAtBottom={false}
                >
                    { this.state.gifs.map((gif) => (
                        <GifThumbnail
                            key={gif.id}
                            gif={gif}
                            onClick={this.props.addGif}
                        />
                    )) }
                    { this.state.loading && <Spinner /> }
                </ScrollPanel>
            </div>
        );
    }
}
