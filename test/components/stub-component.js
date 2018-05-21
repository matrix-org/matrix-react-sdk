/* A dummy React component which we use for stubbing out app-level components
 */
'use strict';

const React = require('react');

export default class StubComponent extends React.PureComponent {
    render() {
        return <div>{ this.displayName }</div>;
    }
}
