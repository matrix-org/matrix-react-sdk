# MVVM or Model-View-ViewModel in React-SDK

If this document has landed on `develop`, it probably means we want to switch react-sdk over to using the MVVM pattern. This documents explains the big idea and also the small details.

## The big idea

With MVVM, you organize the application code into views, view models and models.

### View Models

The view model is an object tailered to the needs of the view, yet does not know about the view (e.g. no React or DOM related code and no reference to the view). The view model has properties that will be rendered in the corresponding view, methods for reacting to UI interactions, and in rare cases emits events that should trigger an imperative action in the view (anything that is not a rerender, like scrolling an item into view, ...). When the value of a property changes, the view emits a change event, which will cause the view to rerender.

### Child View Models

Properties on the view model are generally of a primitive type, apart from child view models. These will notify the view of changes in the same way, but would generally only change if they are being set or cleared, or represent a different entity, and not if a property on the child view model changes itself. When changing, they should be assigned a new instance so comparing the object references shows they have changed. In this way, changes are isolated within their view model and don't affect the parent or child view models. If needed, view models are cleaned up by their parent view model, not by the view.

An example could be a `SessionViewModel` having a `currentRoomViewModel` property, which only changes when you change the room, but not when the name of the room changes for example. That change would only be reported on the `RoomViewModel` itself.

### Views

The view only knows about the view model and uses the properties on the view model to render itself. The goal is to keep the view as small as possible, and put as much logic as possible into the view model. The view may call methods on the view model, for example when it is interacted with, which in turn might cause properties on the view model to change and rerender the view.

### Model

The model is any code in the deeper layers of the application that is unrelated to presentation, and the term is loosely used for any code that is not a view or view model.

## The small details

### Pushing updates to the view

The ViewModel base class is basically just an event emitter. As mentioned, when a property changes, the `change` event is emitted, to which the view should subscribe.

Because it is the model that reports changes, a view is responsible for subscribing to its own model and rerendering itself. This precludes passing the view model properties are props on the React component.

To trigger a rerender, the view uses a state variables for all view properties.

Note that this is somewhat of a shift to how traditional React applications work, where components are ideally passed only props from their parent component, e.g. "pure" components, and don't use any state internally. The parent is responsible for updating the child components in that paradigm. With MVVM, or at least how it is implemented here, the model is responsible for updating the component, and hence the update mechanism needs to be a little different.