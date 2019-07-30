
import { strict as assert } from 'assert';

import React from 'react';
import PropTypes from 'prop-types';
import { MatrixEvent, Room } from 'matrix-js-sdk';

/**
 * Wraps a componenets to provide it the `relations` prop.
 *
 * This wrapper only provides one type of relation to its child component.
 * To deliver the right type of relation to its child this function requires
 * the `relationType` and `eventType` arguments to be passed and the wrapping
 * compnent requires the `mxEvent` and `room` props to be set. These two props
 * are passed down besides the `relations` prop.
 *
 * Props:
 * - `mxEvent`: The event for whicht to get the relations.
 * - `room`: The room in which `mxEvent` was emitted.
 *
 * This component requires its key attribute to be set (e.g. to
 * mxEvent.getId()). This is due the fact that it does not have an update logic
 * for changing props implemented. For more details see
 * https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html#recommendation-fully-uncontrolled-component-with-a-key
 *
 * @param {typeof React.Component} WrappedComponent The component to wrap and
 *     provide the relations to.
 * @param {string} relationType The type of relation to filter for.
 * @param {string} eventType The type of event to filter for.
 * @returns {typeof React.Component}
 */
export function withRelation(WrappedComponent, relationType, eventType) {
class WithRelation extends React.PureComponent {
    static propTypes = {
        mxEvent: PropTypes.instanceOf(MatrixEvent).isRequired,
        room: PropTypes.instanceOf(Room).isRequired,
    };

    constructor(props) {
        super(props);

        this.listenersAdded = false;
        this.creationListenerTarget = null;
        this.relations = null;

        this.onChangeCallback = (e) => {};

        this.state = {relations: []};

        this._setup();
    }

    componentDidMount() {
        this.onChangeCallback = (e) => this.setState({relations: e});

        if (this.relations) {
            this.onChangeCallback(this._getEvents());
        }
    }

    componentWillUnmount() {
        this._removeCreationListener();

        if (this.relations) {
            this._removeListeners(this.relations);
            this.relations = null;
        }

        assert(!this.relations);
        assert(!this.listenersAdded);
        assert(!this.creationListenerTarget);
    }

    _setup() {
        const { mxEvent, room } = this.props;

        assert(!this.relations);
        assert(!this.listenersAdded);

        this.relations = this._getRelations(mxEvent, room);

        if (!this.relations) {
            // No setup happened. Wait for relations to appear.
            this._addCreationListener(mxEvent);
            return;
        }
        this._removeCreationListener();

        this._addListeners(this.relations);

        assert(this.relations);
        assert(this.listenersAdded);
        assert(!this.creationListenerTarget);
    }

    _getRelations(mxEvent, room) {
        const timelineSet = room.getUnfilteredTimelineSet();
        return timelineSet.getRelationsForEvent(
            mxEvent.getId(),
            relationType,
            eventType,
        ) || null;
    }

    _getEvents() {
        return this.relations.getRelations() || [];
    }

    // Relations creation

    _creationCallback = (relationTypeArg, eventTypeArg) => {
        if (relationTypeArg != relationType || eventTypeArg != eventType) {
            return;
        }
        this._removeCreationListener();
        this._setup();
    }

    _addCreationListener(mxEvent) {
        mxEvent.on("Event.relationsCreated", this._creationCallback);
        this.creationListenerTarget = mxEvent;
    }

    _removeCreationListener() {
        if (!this.creationListenerTarget) {
            return;
        }
        this.creationListenerTarget.removeListener(
            "Event.relationsCreated",
            this._creationCallback,
        );
        this.creationListenerTarget = null;
    }

    // Relations changes

    _notify = () => {
        this.onChangeCallback(this._getEvents());
    }

    _addListeners(relations) {
        if (this.listenersAdded) {
            return;
        }
        relations.on("Relations.add", this._notify);
        relations.on("Relations.remove", this._notify);
        relations.on("Relations.redaction", this._notify);
        this.listenersAdded = true;
    }

    _removeListeners(relations) {
        if (!this.listenersAdded) {
            return;
        }
        relations.removeListener("Relations.add", this._notify);
        relations.removeListener("Relations.remove", this._notify);
        relations.removeListener("Relations.redaction", this._notify);
        this.listenersAdded = false;
    }

    render() {
        return (
            <WrappedComponent relations={this.state.relations} {...this.props} />
        );
    }
}

WithRelation.displayName = `WithRelation(${getDisplayName(WrappedComponent)})`;
return WithRelation;
}

function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}
