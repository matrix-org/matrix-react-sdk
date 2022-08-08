"use strict";

// Extracted from https://github.com/facebook/react/blob/a724a3b578dce77d427bef313102a4d0e978d9b4/packages/react-reconciler/src/ReactFiberTreeReflection.js
var HostRoot = 3;
var Placement = 2;
var Hydrating = 4096;
var NoFlags = 0;

function getNearestMountedFiber(fiber) {
  var node = fiber;
  var nearestMounted = fiber;

  if (!fiber.alternate) {
    // If there is no alternate, this might be a new tree that isn't inserted
    // yet. If it is, then it will have a pending insertion effect on it.
    var nextNode = node;

    do {
      node = nextNode;

      if ((node.flags & (Placement | Hydrating)) !== NoFlags) {
        // This is an insertion or in-progress hydration. The nearest possible
        // mounted fiber is the parent but we need to continue to figure out
        // if that one is still mounted.
        nearestMounted = node["return"];
      }

      nextNode = node["return"];
    } while (nextNode);
  } else {
    while (node["return"]) {
      node = node["return"];
    }
  }

  if (node.tag === HostRoot) {
    // TODO: Check if this was a nested HostRoot when used with
    // renderContainerIntoSubtree.
    return nearestMounted;
  } // If we didn't hit the root, that means that we're in an disconnected tree
  // that has been unmounted.


  return null;
}

function findCurrentFiberUsingSlowPath(fiber) {
  var alternate = fiber.alternate;

  if (!alternate) {
    // If there is no alternate, then we only need to check if it is mounted.
    var nearestMounted = getNearestMountedFiber(fiber);

    if (nearestMounted === null) {
      throw new Error('Unable to find node on an unmounted component.');
    }

    if (nearestMounted !== fiber) {
      return null;
    }

    return fiber;
  } // If we have two possible branches, we'll walk backwards up to the root
  // to see what path the root points to. On the way we may hit one of the
  // special cases and we'll deal with them.


  var a = fiber;
  var b = alternate; // eslint-disable-next-line no-constant-condition

  while (true) {
    var parentA = a["return"];

    if (parentA === null) {
      // We're at the root.
      break;
    }

    var parentB = parentA.alternate;

    if (parentB === null) {
      // There is no alternate. This is an unusual case. Currently, it only
      // happens when a Suspense component is hidden. An extra fragment fiber
      // is inserted in between the Suspense fiber and its children. Skip
      // over this extra fragment fiber and proceed to the next parent.
      var nextParent = parentA["return"];

      if (nextParent !== null) {
        a = b = nextParent;
        continue;
      } // If there's no parent, we're at the root.


      break;
    } // If both copies of the parent fiber point to the same child, we can
    // assume that the child is current. This happens when we bailout on low
    // priority: the bailed out fiber's child reuses the current child.


    if (parentA.child === parentB.child) {
      var child = parentA.child;

      while (child) {
        if (child === a) {
          // We've determined that A is the current branch.
          return fiber;
        }

        if (child === b) {
          // We've determined that B is the current branch.
          return alternate;
        }

        child = child.sibling;
      } // We should never have an alternate for any mounting node. So the only
      // way this could possibly happen is if this was unmounted, if at all.


      throw new Error('Unable to find node on an unmounted component.');
    }

    if (a["return"] !== b["return"]) {
      // The return pointer of A and the return pointer of B point to different
      // fibers. We assume that return pointers never criss-cross, so A must
      // belong to the child set of A.return, and B must belong to the child
      // set of B.return.
      a = parentA;
      b = parentB;
    } else {
      // The return pointers point to the same fiber. We'll have to use the
      // default, slow path: scan the child sets of each parent alternate to see
      // which child belongs to which set.
      //
      // Search parent A's child set
      var didFindChild = false;
      var _child = parentA.child;

      while (_child) {
        if (_child === a) {
          didFindChild = true;
          a = parentA;
          b = parentB;
          break;
        }

        if (_child === b) {
          didFindChild = true;
          b = parentA;
          a = parentB;
          break;
        }

        _child = _child.sibling;
      }

      if (!didFindChild) {
        // Search parent B's child set
        _child = parentB.child;

        while (_child) {
          if (_child === a) {
            didFindChild = true;
            a = parentB;
            b = parentA;
            break;
          }

          if (_child === b) {
            didFindChild = true;
            b = parentB;
            a = parentA;
            break;
          }

          _child = _child.sibling;
        }

        if (!didFindChild) {
          throw new Error('Child was not found in either parent set. This indicates a bug ' + 'in React related to the return pointer. Please file an issue.');
        }
      }
    }

    if (a.alternate !== b) {
      throw new Error("Return fibers should always be each others' alternates. " + 'This error is likely caused by a bug in React. Please file an issue.');
    }
  } // If the root is not a host container, we're in a disconnected tree. I.e.
  // unmounted.


  if (a.tag !== HostRoot) {
    throw new Error('Unable to find node on an unmounted component.');
  }

  if (a.stateNode.current === a) {
    // We've determined that A is the current branch.
    return fiber;
  } // Otherwise B has to be current branch.


  return alternate;
}

module.exports = findCurrentFiberUsingSlowPath;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9maW5kQ3VycmVudEZpYmVyVXNpbmdTbG93UGF0aC5qcyJdLCJuYW1lcyI6WyJIb3N0Um9vdCIsIlBsYWNlbWVudCIsIkh5ZHJhdGluZyIsIk5vRmxhZ3MiLCJnZXROZWFyZXN0TW91bnRlZEZpYmVyIiwiZmliZXIiLCJub2RlIiwibmVhcmVzdE1vdW50ZWQiLCJhbHRlcm5hdGUiLCJuZXh0Tm9kZSIsImZsYWdzIiwidGFnIiwiZmluZEN1cnJlbnRGaWJlclVzaW5nU2xvd1BhdGgiLCJFcnJvciIsImEiLCJiIiwicGFyZW50QSIsInBhcmVudEIiLCJuZXh0UGFyZW50IiwiY2hpbGQiLCJzaWJsaW5nIiwiZGlkRmluZENoaWxkIiwic3RhdGVOb2RlIiwiY3VycmVudCIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFFQSxJQUFNQSxRQUFRLEdBQUcsQ0FBakI7QUFFQSxJQUFNQyxTQUFTLEdBQUcsQ0FBbEI7QUFDQSxJQUFNQyxTQUFTLEdBQUcsSUFBbEI7QUFDQSxJQUFNQyxPQUFPLEdBQUcsQ0FBaEI7O0FBRUEsU0FBU0Msc0JBQVQsQ0FBZ0NDLEtBQWhDLEVBQXVDO0FBQ3JDLE1BQUlDLElBQUksR0FBR0QsS0FBWDtBQUNBLE1BQUlFLGNBQWMsR0FBR0YsS0FBckI7O0FBQ0EsTUFBSSxDQUFDQSxLQUFLLENBQUNHLFNBQVgsRUFBc0I7QUFDcEI7QUFDQTtBQUNBLFFBQUlDLFFBQVEsR0FBR0gsSUFBZjs7QUFDQSxPQUFHO0FBQ0RBLE1BQUFBLElBQUksR0FBR0csUUFBUDs7QUFDQSxVQUFJLENBQUNILElBQUksQ0FBQ0ksS0FBTCxJQUFjVCxTQUFTLEdBQUdDLFNBQTFCLENBQUQsTUFBMkNDLE9BQS9DLEVBQXdEO0FBQ3REO0FBQ0E7QUFDQTtBQUNBSSxRQUFBQSxjQUFjLEdBQUdELElBQUksVUFBckI7QUFDRDs7QUFDREcsTUFBQUEsUUFBUSxHQUFHSCxJQUFJLFVBQWY7QUFDRCxLQVRELFFBU1NHLFFBVFQ7QUFV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R0FBaUJiLDZCQUFqQiIsInNvdXJjZXNDb250ZW50IjpbIi8vIEV4dHJhY3RlZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9mYWNlYm9vay9yZWFjdC9ibG9iL2E3MjRhM2I1NzhkY2U3N2Q0MjdiZWYzMTMxMDJhNGQwZTk3OGQ5YjQvcGFja2FnZXMvcmVhY3QtcmVjb25jaWxlci9zcmMvUmVhY3RGaWJlclRyZWVSZWZsZWN0aW9uLmpzXG5cbmNvbnN0IEhvc3RSb290ID0gMztcblxuY29uc3QgUGxhY2VtZW50ID0gMGIwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDEwO1xuY29uc3QgSHlkcmF0aW5nID0gMGIwMDAwMDAwMDAwMDAxMDAwMDAwMDAwMDAwO1xuY29uc3QgTm9GbGFncyA9IDBiMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDtcblxuZnVuY3Rpb24gZ2V0TmVhcmVzdE1vdW50ZWRGaWJlcihmaWJlcikge1xuICBsZXQgbm9kZSA9IGZpYmVyO1xuICBsZXQgbmVhcmVzdE1vdW50ZWQgPSBmaWJlcjtcbiAgaWYgKCFmaWJlci5hbHRlcm5hdGUpIHtcbiAgICAvLyBJZiB0aGVyZSBpcyBubyBhbHRlcm5hdGUsIHRoaXMgbWlnaHQgYmUgYSBuZXcgdHJlZSB0aGF0IGlzbid0IGluc2VydGVkXG4gICAgLy8geWV0LiBJZiBpdCBpcywgdGhlbiBpdCB3aWxsIGhhdmUgYSBwZW5kaW5nIGluc2VydGlvbiBlZmZlY3Qgb24gaXQuXG4gICAgbGV0IG5leHROb2RlID0gbm9kZTtcbiAgICBkbyB7XG4gICAgICBub2RlID0gbmV4dE5vZGU7XG4gICAgICBpZiAoKG5vZGUuZmxhZ3MgJiAoUGxhY2VtZW50IHwgSHlkcmF0aW5nKSkgIT09IE5vRmxhZ3MpIHtcbiAgICAgICAgLy8gVGhpcyBpcyBhbiBpbnNlcnRpb24gb3IgaW4tcHJvZ3Jlc3MgaHlkcmF0aW9uLiBUaGUgbmVhcmVzdCBwb3NzaWJsZVxuICAgICAgICAvLyBtb3VudGVkIGZpYmVyIGlzIHRoZSBwYXJlbnQgYnV0IHdlIG5lZWQgdG8gY29udGludWUgdG8gZmlndXJlIG91dFxuICAgICAgICAvLyBpZiB0aGF0IG9uZSBpcyBzdGlsbCBtb3VudGVkLlxuICAgICAgICBuZWFyZXN0TW91bnRlZCA9IG5vZGUucmV0dXJuO1xuICAgICAgfVxuICAgICAgbmV4dE5vZGUgPSBub2RlLnJldHVybjtcbiAgICB9IHdoaWxlIChuZXh0Tm9kZSk7XG4gIH0gZWxzZSB7XG4gICAgd2hpbGUgKG5vZGUucmV0dXJuKSB7XG4gICAgICBub2RlID0gbm9kZS5yZXR1cm47XG4gICAgfVxuICB9XG4gIGlmIChub2RlLnRhZyA9PT0gSG9zdFJvb3QpIHtcbiAgICAvLyBUT0RPOiBDaGVjayBpZiB0aGlzIHdhcyBhIG5lc3RlZCBIb3N0Um9vdCB3aGVuIHVzZWQgd2l0aFxuICAgIC8vIHJlbmRlckNvbnRhaW5lckludG9TdWJ0cmVlLlxuICAgIHJldHVybiBuZWFyZXN0TW91bnRlZDtcbiAgfVxuICAvLyBJZiB3ZSBkaWRuJ3QgaGl0IHRoZSByb290LCB0aGF0IG1lYW5zIHRoYXQgd2UncmUgaW4gYW4gZGlzY29ubmVjdGVkIHRyZWVcbiAgLy8gdGhhdCBoYXMgYmVlbiB1bm1vdW50ZWQuXG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBmaW5kQ3VycmVudEZpYmVyVXNpbmdTbG93UGF0aChmaWJlcikge1xuICBjb25zdCBhbHRlcm5hdGUgPSBmaWJlci5hbHRlcm5hdGU7XG4gIGlmICghYWx0ZXJuYXRlKSB7XG4gICAgLy8gSWYgdGhlcmUgaXMgbm8gYWx0ZXJuYXRlLCB0aGVuIHdlIG9ubHkgbmVlZCB0byBjaGVjayBpZiBpdCBpcyBtb3VudGVkLlxuICAgIGNvbnN0IG5lYXJlc3RNb3VudGVkID0gZ2V0TmVhcmVzdE1vdW50ZWRGaWJlcihmaWJlcik7XG5cbiAgICBpZiAobmVhcmVzdE1vdW50ZWQgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5hYmxlIHRvIGZpbmQgbm9kZSBvbiBhbiB1bm1vdW50ZWQgY29tcG9uZW50LicpO1xuICAgIH1cblxuICAgIGlmIChuZWFyZXN0TW91bnRlZCAhPT0gZmliZXIpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gZmliZXI7XG4gIH1cbiAgLy8gSWYgd2UgaGF2ZSB0d28gcG9zc2libGUgYnJhbmNoZXMsIHdlJ2xsIHdhbGsgYmFja3dhcmRzIHVwIHRvIHRoZSByb290XG4gIC8vIHRvIHNlZSB3aGF0IHBhdGggdGhlIHJvb3QgcG9pbnRzIHRvLiBPbiB0aGUgd2F5IHdlIG1heSBoaXQgb25lIG9mIHRoZVxuICAvLyBzcGVjaWFsIGNhc2VzIGFuZCB3ZSdsbCBkZWFsIHdpdGggdGhlbS5cbiAgbGV0IGEgPSBmaWJlcjtcbiAgbGV0IGIgPSBhbHRlcm5hdGU7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zdGFudC1jb25kaXRpb25cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCBwYXJlbnRBID0gYS5yZXR1cm47XG4gICAgaWYgKHBhcmVudEEgPT09IG51bGwpIHtcbiAgICAgIC8vIFdlJ3JlIGF0IHRoZSByb290LlxuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGNvbnN0IHBhcmVudEIgPSBwYXJlbnRBLmFsdGVybmF0ZTtcbiAgICBpZiAocGFyZW50QiA9PT0gbnVsbCkge1xuICAgICAgLy8gVGhlcmUgaXMgbm8gYWx0ZXJuYXRlLiBUaGlzIGlzIGFuIHVudXN1YWwgY2FzZS4gQ3VycmVudGx5LCBpdCBvbmx5XG4gICAgICAvLyBoYXBwZW5zIHdoZW4gYSBTdXNwZW5zZSBjb21wb25lbnQgaXMgaGlkZGVuLiBBbiBleHRyYSBmcmFnbWVudCBmaWJlclxuICAgICAgLy8gaXMgaW5zZXJ0ZWQgaW4gYmV0d2VlbiB0aGUgU3VzcGVuc2UgZmliZXIgYW5kIGl0cyBjaGlsZHJlbi4gU2tpcFxuICAgICAgLy8gb3ZlciB0aGlzIGV4dHJhIGZyYWdtZW50IGZpYmVyIGFuZCBwcm9jZWVkIHRvIHRoZSBuZXh0IHBhcmVudC5cbiAgICAgIGNvbnN0IG5leHRQYXJlbnQgPSBwYXJlbnRBLnJldHVybjtcbiAgICAgIGlmIChuZXh0UGFyZW50ICE9PSBudWxsKSB7XG4gICAgICAgIGEgPSBiID0gbmV4dFBhcmVudDtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICAvLyBJZiB0aGVyZSdzIG5vIHBhcmVudCwgd2UncmUgYXQgdGhlIHJvb3QuXG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICAvLyBJZiBib3RoIGNvcGllcyBvZiB0aGUgcGFyZW50IGZpYmVyIHBvaW50IHRvIHRoZSBzYW1lIGNoaWxkLCB3ZSBjYW5cbiAgICAvLyBhc3N1bWUgdGhhdCB0aGUgY2hpbGQgaXMgY3VycmVudC4gVGhpcyBoYXBwZW5zIHdoZW4gd2UgYmFpbG91dCBvbiBsb3dcbiAgICAvLyBwcmlvcml0eTogdGhlIGJhaWxlZCBvdXQgZmliZXIncyBjaGlsZCByZXVzZXMgdGhlIGN1cnJlbnQgY2hpbGQuXG4gICAgaWYgKHBhcmVudEEuY2hpbGQgPT09IHBhcmVudEIuY2hpbGQpIHtcbiAgICAgIGxldCBjaGlsZCA9IHBhcmVudEEuY2hpbGQ7XG4gICAgICB3aGlsZSAoY2hpbGQpIHtcbiAgICAgICAgaWYgKGNoaWxkID09PSBhKSB7XG4gICAgICAgICAgLy8gV2UndmUgZGV0ZXJtaW5lZCB0aGF0IEEgaXMgdGhlIGN1cnJlbnQgYnJhbmNoLlxuICAgICAgICAgIHJldHVybiBmaWJlcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2hpbGQgPT09IGIpIHtcbiAgICAgICAgICAvLyBXZSd2ZSBkZXRlcm1pbmVkIHRoYXQgQiBpcyB0aGUgY3VycmVudCBicmFuY2guXG4gICAgICAgICAgcmV0dXJuIGFsdGVybmF0ZTtcbiAgICAgICAgfVxuICAgICAgICBjaGlsZCA9IGNoaWxkLnNpYmxpbmc7XG4gICAgICB9XG5cbiAgICAgIC8vIFdlIHNob3VsZCBuZXZlciBoYXZlIGFuIGFsdGVybmF0ZSBmb3IgYW55IG1vdW50aW5nIG5vZGUuIFNvIHRoZSBvbmx5XG4gICAgICAvLyB3YXkgdGhpcyBjb3VsZCBwb3NzaWJseSBoYXBwZW4gaXMgaWYgdGhpcyB3YXMgdW5tb3VudGVkLCBpZiBhdCBhbGwuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBmaW5kIG5vZGUgb24gYW4gdW5tb3VudGVkIGNvbXBvbmVudC4nKTtcbiAgICB9XG5cbiAgICBpZiAoYS5yZXR1cm4gIT09IGIucmV0dXJuKSB7XG4gICAgICAvLyBUaGUgcmV0dXJuIHBvaW50ZXIgb2YgQSBhbmQgdGhlIHJldHVybiBwb2ludGVyIG9mIEIgcG9pbnQgdG8gZGlmZmVyZW50XG4gICAgICAvLyBmaWJlcnMuIFdlIGFzc3VtZSB0aGF0IHJldHVybiBwb2ludGVycyBuZXZlciBjcmlzcy1jcm9zcywgc28gQSBtdXN0XG4gICAgICAvLyBiZWxvbmcgdG8gdGhlIGNoaWxkIHNldCBvZiBBLnJldHVybiwgYW5kIEIgbXVzdCBiZWxvbmcgdG8gdGhlIGNoaWxkXG4gICAgICAvLyBzZXQgb2YgQi5yZXR1cm4uXG4gICAgICBhID0gcGFyZW50QTtcbiAgICAgIGIgPSBwYXJlbnRCO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUaGUgcmV0dXJuIHBvaW50ZXJzIHBvaW50IHRvIHRoZSBzYW1lIGZpYmVyLiBXZSdsbCBoYXZlIHRvIHVzZSB0aGVcbiAgICAgIC8vIGRlZmF1bHQsIHNsb3cgcGF0aDogc2NhbiB0aGUgY2hpbGQgc2V0cyBvZiBlYWNoIHBhcmVudCBhbHRlcm5hdGUgdG8gc2VlXG4gICAgICAvLyB3aGljaCBjaGlsZCBiZWxvbmdzIHRvIHdoaWNoIHNldC5cbiAgICAgIC8vXG4gICAgICAvLyBTZWFyY2ggcGFyZW50IEEncyBjaGlsZCBzZXRcbiAgICAgIGxldCBkaWRGaW5kQ2hpbGQgPSBmYWxzZTtcbiAgICAgIGxldCBjaGlsZCA9IHBhcmVudEEuY2hpbGQ7XG4gICAgICB3aGlsZSAoY2hpbGQpIHtcbiAgICAgICAgaWYgKGNoaWxkID09PSBhKSB7XG4gICAgICAgICAgZGlkRmluZENoaWxkID0gdHJ1ZTtcbiAgICAgICAgICBhID0gcGFyZW50QTtcbiAgICAgICAgICBiID0gcGFyZW50QjtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2hpbGQgPT09IGIpIHtcbiAgICAgICAgICBkaWRGaW5kQ2hpbGQgPSB0cnVlO1xuICAgICAgICAgIGIgPSBwYXJlbnRBO1xuICAgICAgICAgIGEgPSBwYXJlbnRCO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIGNoaWxkID0gY2hpbGQuc2libGluZztcbiAgICAgIH1cbiAgICAgIGlmICghZGlkRmluZENoaWxkKSB7XG4gICAgICAgIC8vIFNlYXJjaCBwYXJlbnQgQidzIGNoaWxkIHNldFxuICAgICAgICBjaGlsZCA9IHBhcmVudEIuY2hpbGQ7XG4gICAgICAgIHdoaWxlIChjaGlsZCkge1xuICAgICAgICAgIGlmIChjaGlsZCA9PT0gYSkge1xuICAgICAgICAgICAgZGlkRmluZENoaWxkID0gdHJ1ZTtcbiAgICAgICAgICAgIGEgPSBwYXJlbnRCO1xuICAgICAgICAgICAgYiA9IHBhcmVudEE7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGNoaWxkID09PSBiKSB7XG4gICAgICAgICAgICBkaWRGaW5kQ2hpbGQgPSB0cnVlO1xuICAgICAgICAgICAgYiA9IHBhcmVudEI7XG4gICAgICAgICAgICBhID0gcGFyZW50QTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjaGlsZCA9IGNoaWxkLnNpYmxpbmc7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWRpZEZpbmRDaGlsZCkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgICdDaGlsZCB3YXMgbm90IGZvdW5kIGluIGVpdGhlciBwYXJlbnQgc2V0LiBUaGlzIGluZGljYXRlcyBhIGJ1ZyAnICtcbiAgICAgICAgICAgICAgJ2luIFJlYWN0IHJlbGF0ZWQgdG8gdGhlIHJldHVybiBwb2ludGVyLiBQbGVhc2UgZmlsZSBhbiBpc3N1ZS4nLFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoYS5hbHRlcm5hdGUgIT09IGIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgXCJSZXR1cm4gZmliZXJzIHNob3VsZCBhbHdheXMgYmUgZWFjaCBvdGhlcnMnIGFsdGVybmF0ZXMuIFwiICtcbiAgICAgICAgICAnVGhpcyBlcnJvciBpcyBsaWtlbHkgY2F1c2VkIGJ5IGEgYnVnIGluIFJlYWN0LiBQbGVhc2UgZmlsZSBhbiBpc3N1ZS4nLFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICAvLyBJZiB0aGUgcm9vdCBpcyBub3QgYSBob3N0IGNvbnRhaW5lciwgd2UncmUgaW4gYSBkaXNjb25uZWN0ZWQgdHJlZS4gSS5lLlxuICAvLyB1bm1vdW50ZWQuXG4gIGlmIChhLnRhZyAhPT0gSG9zdFJvb3QpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBmaW5kIG5vZGUgb24gYW4gdW5tb3VudGVkIGNvbXBvbmVudC4nKTtcbiAgfVxuXG4gIGlmIChhLnN0YXRlTm9kZS5jdXJyZW50ID09PSBhKSB7XG4gICAgLy8gV2UndmUgZGV0ZXJtaW5lZCB0aGF0IEEgaXMgdGhlIGN1cnJlbnQgYnJhbmNoLlxuICAgIHJldHVybiBmaWJlcjtcbiAgfVxuICAvLyBPdGhlcndpc2UgQiBoYXMgdG8gYmUgY3VycmVudCBicmFuY2guXG4gIHJldHVybiBhbHRlcm5hdGU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZmluZEN1cnJlbnRGaWJlclVzaW5nU2xvd1BhdGg7XG4iXX0=
//# sourceMappingURL=findCurrentFiberUsingSlowPath.js.map