import React from "react";
import createReactClass from "create-react-class";

module.exports = createReactClass({
    displayName: "CallTimer",

    // GET INITIAL STATE IS CONSTRUCTOR
    getInitialState: function() {
        return {
            seconds: 0,
            minutes: 0,
            hours: 0,
            timer: null
        };
    },

    componentDidMount() {
        this.startTimer();
    },

    componentWillUnmount() {
        this.startTimer();
    },

    startTimer: function() {
        if (!this.state.timer) {
            this.state.timer = setInterval(() => {
                if (this.state.seconds === 59) {
                    this.setState({
                        seconds: 0,
                        minutes: this.state.minutes + 1
                    });
                    if (this.state.minutes === 60) {
                        this.setState({
                            minutes: 0,
                            hours: this.state.hours + 1
                        });
                        if (this.state.hours === 100) {
                            this.setState({
                                hours: 0
                            });
                        }
                    }
                } else {
                    this.setState({ seconds: this.state.seconds + 1 });
                }
            }, 1000);
        } else {
            clearInterval(this.state.timer);
        }
    },

    stopTimer: function() {
        clearInterval();
    },

    formatSingleDigit(num) {
        return num < 10 ? `0${num}` : num;
    },

    render: function() {
        return (
            <div>
                <p className="mx_TextualEvent call-timer">
                    {this.formatSingleDigit(this.state.hours)}:
                    {this.formatSingleDigit(this.state.minutes)}:
                    {this.formatSingleDigit(this.state.seconds)}
                    {/*
                    {this.state.hours < 10
                        ? `0${this.state.hours}`
                        : `${this.state.hours}`}
                    :
                    {this.state.minutes < 10
                        ? `0${this.state.minutes}`
                        : `${this.state.minutes}`}
                    :
                    {this.state.seconds < 10
                        ? `0${this.state.seconds}`
                        : `${this.state.seconds}`} */}
                </p>
            </div>
        );
    }
});
