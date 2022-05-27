// eslint-disable-next-line matrix-org/require-copyright-header
import React from "react";

interface IProps{
    addGif: (gif: Gif) => void;
}

interface IState{
    gifs?: Gif[];
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
        fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${(this.APIKEY)}&limit=25&rating=r`)
            .then(response => response.json())
            .then(data => {
                this.setState({
                    gifs: data.data,
                });
            });
    };

    setGifsToSearch = (query, offset) => {
        let gifs = [];
        if (offset!=0) {
            gifs = this.state.gifs;
        }
        fetch(`https://api.giphy.com/v1/gifs/search?api_key=${(this.APIKEY)}&q=${query}&limit=${this.LIMIT}&rating=r&offset=${offset}`)
            .then(response => response.json())
            .then(data => {
                gifs.push(...data.data);
                this.setState({
                    gifs: gifs,
                });
            });
    };

    handleScroll = (e) => {
        const bottom = e.target.scrollHeight - e.target.scrollTop === e.target.clientHeight;
        if (bottom) {
            if (this.state.searchTerm != '') {
                this.setGifsToSearch(this.state.searchTerm, this.state.gifs.length);
            }
        }
    };

    render() {
        return (
            <div>
                <div className="mx_GifPicker_Menubar">
                    <input
                        type="text"
                        onChange={this.handleSearchBar}
                        placeholder="Search GIPHY"
                    />
                    <img key="poweredBy"
                        src={require("../../../../res/img/element-icons/gifpicker/powered_by_giphy.png")}
                        alt="Powered by Giphy"
                        height="10px"
                    />
                </div>
                <div className="mx_GifPicker" onScroll={this.handleScroll}>
                    { this.state.gifs.map(d => (
                        <div key={d.id}>
                            <button key={"button_"+d.id} onClick={() => this.handleClick(d)}>
                                <img key={d.id} src={d.images.fixed_height_small.url} />
                            </button>
                        </div>
                    )) }
                </div>
            </div>
        );
    }
}

export default GifPicker;
