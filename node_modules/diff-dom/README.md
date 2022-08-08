# diffDOM - A JavaScript diffing algorithm for DOM elements

This library allows the abstraction of differences between DOM
elements as a "diff" object, representing the sequence of modifications
that must be applied to one element in order to turn it into the other
element. This diff is non-destructive, meaning that relocations of
DOM nodes are preferred over remove-insert operations.

## License

This project is licensed under the LGPL v. 3. For details see LICENSE.txt.

## Demo and tests

Check http://fiduswriter.github.io/diffDOM for demo and tests.

## Usage

Include the diffDOM file in your HTML like this:
```html
<script src="browser/diffDOM.js"></script>
```

Or like this if you import from npm:
```js
import {DiffDOM} from "diff-dom"
```

Then create an instance of diffDOM within the javascript code:
```js
dd = new diffDOM.DiffDOM();
```

(leave out the `diffdom.` if you use the npm-version)

Now you can create a diff to get from dom `elementA` to dom `elementB` like this:
```js
diff = dd.diff(elementA, elementB);
```

You can now apply this diff like this:
```js
dd.apply(elementA, diff);
```
Now `elementA` will have been changed to be structurally equal to `elementB`.

### Virtual DOM and HTML strings

You can also use HTML strings or the virtual DOM objects diffDOM uses internally to create diffs.

```js
diff = dd.diff(elementA, '<div>hello</div>')
```

You can create the Virtual DOM objects diffDOM uses, create them like this:

```js
import {nodeToObj, stringToObj} from "diff-dom"

obj1 = nodeToObj(elementA)
obj2 = stringToObj('<div>hello</div>')
```

Diffing between these objects will be faster than diffing DOM nodes and can be useful in environments
without access to the DOM.

### Advanced uses

#### Undo

Continuing on from the previous example, you can also undo a diff, like this:
```js
dd.undo(elementA, diff);
```
Now elementA will be what it was like before applying the diff.

#### Remote changes

If you need to move diffs from one machine to another one, you will likely want to send the diffs through a websocket connection or as part of a form submit. In both cases you need to convert the diff to a json `string`.

To convert a diff to a json string which you can send over the network, do:
```js
diffJson = JSON.stringify(diff);
```

On the receiving end you then need to unpack it like this:
```js
diff = JSON.parse(diffJson);
```

#### Error handling when patching/applying

Sometimes one may try to patch an elment without knowing whether the patch actually will apply cleanly. This should not be a problem. If diffDOM determines that a patch cannot be executed, it will simple return `false`. Else it will return `true`:
```js
result = dd.apply(element, diff);

if (result) {
    console.log('no problem!');
} else {
    console.log('diff could not be applied');
}
```
#### Advanced merging of text node changes

diffDOM does not include merging for changes to text nodes. However, it includes hooks so that you can add more advanced handling. Simple overwrite the `textDiff` function of the `diffDOM` instance. The functions TEXTDIFF and TEXTPATCH need to be defined in the code:
```js
dd = new diffDOM.DiffDOM({
    textDiff: function (node, currentValue, expectedValue, newValue) {
        if (currentValue===expectedValue) {
            // The text node contains the text we expect it to contain, so we simple change the text of it to the new value.
            node.data = newValue;
        } else {
            // The text node currently does not contain what we expected it to contain, so we need to merge.
            difference = TEXTDIFF(expectedValue, currentValue);
            node.data = TEXTPATCH(newValue, difference);
        }
        return true;
    }
  });
```

#### Pre and post diff hooks

diffDOM provides extension points before and after virtual and actual diffs, exposing some of the internals of the diff algorithm, and allowing you to make additional decisions based on that information.

```js
dd = new diffDOM.DiffDOM({
    preVirtualDiffApply: function (info) {
        console.log(info);
    },
    postVirtualDiffApply: function (info) {
        console.log(info);
    },
    preDiffApply: function (info) {
        console.log(info);
    },
    postDiffApply: function (info) {
        console.log(info);
    }
  });
```

Additionally, the _pre_ hooks allow you to shortcircuit the standard behaviour of the diff by returning `true` from this callback. This will cause the `diffApply` functions to return prematurely, skipping their standard behaviour.

```js
dd = new diffDOM.DiffDOM({
    // prevent removal of attributes
    preDiffApply: function (info) {
        if (info.diff.action === 'removeAttribute') {
            console.log("preventing attribute removal");
            return true;
        }
    }
  });
```

#### Outer and Inner diff hooks

diffDOM also provides a way to filter outer diff

```js
dd = new diffDOM.DiffDOM({
    filterOuterDiff: function(t1, t2, diffs) {
        // can change current outer diffs by returning a new array,
        // or by mutating outerDiffs.
        if (!diffs.length && t1.nodeName == "my-component" && t2.nodeName == t1.nodeName) {
            // will not diff childNodes
            t1.innerDone = true;
        }
    }
});
```

#### Debugging

For debugging you might want to set a max number of diff changes between two elements before diffDOM gives up. To allow for a maximum of 500 differences between elements when diffing, initialize diffDOM like this:
```js
dd = new diffDOM.DiffDOM({
    debug: true,
    diffcap: 500
  });
```

#### Disable value diff detection

For forms that have been filled out by a user in ways that have changed which value is associated with an input field or which options are checked/selected without
the DOM having been updated, the values are diffed. For use cases in which no changes have been made to any of the form values, one may choose to skip diffing the values. To do this, hand `false` as a third configuration option to diffDOM:
```js
dd = new diffDOM.DiffDOM({
    valueDiffing: false
  });
```
