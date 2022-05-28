// eslint-disable-next-line matrix-org/require-copyright-header
import React from "react";

interface IProps{
    addGif: (gif: Gif) => void;
}

interface IState{
    gifs?: Gif[][];
    searchTerm: string;
}

class GifPicker extends React.Component<IProps, IState> {
    APIKEY='6Tw2aRXJfcL58cqo8UCnHIBs0gQ4P2Ps';
    LIMIT=10;

    constructor(props) {
        super(props);

        this.state = {
            gifs: [],
            searchTerm: "",
        };
        this.setGifsToTrending();
    }

    handleClick(gif: Gif) {
        this.props.addGif(gif);
    }

    handleSearchBar = (event) => {
        this.setState({ searchTerm: event.target.value });
        if (event.target.value == '') {
            this.setGifsToTrending();
        } else {
            this.setGifsToSearch(event.target.value, 0);
        }
    };

    setGifsToTrending = () => {
        const gifs = [[], []];
        fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${(this.APIKEY)}&limit=26&rating=r`)
            .then(response => response.json())
            .then(data => {
                gifs[0] = data.data.slice(0, 13);
                gifs[1] = data.data.slice(14, 25);
                this.setState({
                    gifs: gifs,
                });
            });
    };

    setGifsToSearch = (query, offset) => {
        let gifs = [[], []];
        if (offset!=0) {
            gifs = this.state.gifs;
        }
        fetch(`https://api.giphy.com/v1/gifs/search?api_key=${(this.APIKEY)}&q=${query}&limit=${this.LIMIT}&rating=r&offset=${offset}`)
            .then(response => response.json())
            .then(data => {
                gifs[0].push(...data.data.slice(0, this.LIMIT/2-1));
                gifs[1].push(...data.data.slice(this.LIMIT/2, this.LIMIT-1));
                this.setState({
                    gifs: gifs,
                });
            });
    };

    handleScroll = (e) => {
        const bottom = e.target.scrollHeight - e.target.scrollTop === e.target.clientHeight;
        if (bottom) {
            if (this.state.searchTerm != '') {
                this.setGifsToSearch(this.state.searchTerm, this.state.gifs[0].length+this.state.gifs[1].length);
            }
        }
    };

    render() {
        return (
            <div className="mx_GifPicker_Box">
                <div className="mx_GifPicker_Menubar">
                    <div className="mx_GifPicker_Search">
                        <div className="mx_GifPicker_SearchIcon" />
                        <input
                            type="search"
                            onChange={this.handleSearchBar}
                            placeholder="Search GIPHY"
                            className="mx_GifPicker_Searchbar"
                        />
                    </div>

                    <img key="poweredBy"
                        src={require("../../../../res/img/element-icons/gifpicker/powered_by_giphy.png")}
                        alt="Powered by Giphy"
                        height="10px"
                    />
                </div>
                <div className="mx_GifPicker" onScroll={this.handleScroll}>
                    { this.state.gifs.map(column => (
                        <>
                            <div className="mx_GifPicker_Column">
                                { column.map((gif) => (
                                    <div key={gif.id}>
                                        <button key={`button_${gif.id}`} onClick={() => this.handleClick(gif)}>
                                            <img key={`img_${gif.id}`}
                                                src={gif.images.fixed_height_small.url}
                                                className="mx_GifPicker_Gif"
                                                alt={gif.slug} />
                                        </button>
                                    </div>
                                )) }
                            </div>
                        </>
                    )) }
                </div>
            </div>
        );
    }
}

export default GifPicker;
