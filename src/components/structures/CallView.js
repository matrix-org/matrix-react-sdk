import React from "react";
import createReactClass from "create-react-class";

module.exports = createReactClass({
    displayName: "CallView",
    getInitialState: function() {
        return {
            room: null,
            roomId: null
        };
    },
    render: function() {
        return (
            <div>
                <h1>SalesForce</h1>
                <h1>ZenDesk</h1>
                <h1>Microsoft Dynamics</h1>
                <h1>Kazoo</h1>
                <h1>Contacts</h1>
            </div>
        );
    }
});
