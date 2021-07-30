# Asynchronous Web Requests with Using Thunk and Redux

## Objectives

- Learn how to use action creator functions to make asynchronous web requests
  for data in `Redux`
- Understand why we need special middleware in order to make some action creator
  functions able to make asynchronous web requests.
- Learn how to use the **Redux Thunk** middleware to make some actions
  asynchronous

## Introduction

Part of the value of using Redux is that it provides a centralized way to
control the data of an application. In a standard React + Redux application, any
child component can connect to the store directly from anywhere in the app. This
allows us to keep many of our React components simple — no need for
passing props through many nested components, no need to use component `state`
to keep track of all the data. A lot of code that would normally be stored in
React components can be removed or replaced.

With Redux, we can focus more on presentation in our React components, and use
actions and reducers to handle the logic of organizing data. In following with
this pattern, we'll be discussing a package that works in conjunction with
Redux: `redux-thunk`.

`redux-thunk` handles asynchronous calls when working with Redux. Think for a
moment: we have Redux handling all our app's data. So far, it's all been
hard-coded data, i.e. data that we set ourselves. It would be great if we could
start getting data from other sources.

Well, if we had a server or an API, we could _fetch_ some remote data, but we're
presented with a familiar problem: we've just removed a lot of logic from our
components and now we're going to add more logic? Specifically, we're going to
fetch data we'll likely want to keep in our Redux store — adding code to
our components seems to be a step backwards.

With `redux-thunk`, we can incorporate asynchronous code in with our Redux
actions. This allows us to continue keeping our components relatively simple and
more focused on presentation. In this lesson, we're going to go through what
Thunk is and how it is implemented with Redux.

## Trying to Send an Asynchronous Request in Redux

We're familiar with the `redux` pattern in which the store dispatches an action
to the reducer, the reducer uses that action to make changes to the state, and
components re-render with new data.

Going back to hard-coded examples, in previous lessons, we populated our store
using data inside an action creator function. Something like this:

```js
function fetchAstronauts() {
  const astronauts = [
    { name: "Neil Armstrong", craft: "Apollo 11" },
    { name: "Buzz Aldrin", craft: "Apollo 11" },
    { name: "Michael Collins", craft: "Apollo 11" },
  ];
  return {
    type: "astronauts/add",
    astronauts,
  };
}
```

What happens though, when we're ready to pull in real live data from an external
source like an API?

Well, we already know how to make a web request. We can use something like
JavaScript's native Fetch API to send a web request:

```js
fetch("http://api.open-notify.org/astros.json");
```

So, can we simply make a `fetch` request inside our action creator function
instead of hard-coding our data? The code below is a good attempt, but it
ultimately ends in failure and disappointment:

```js
// ./src/features/astronauts/Astronauts.js
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAstronauts } from "./astronautsSlice";

function Astronauts() {
  const dispatch = useDispatch();

  const astronauts = useSelector((state) => state.astronauts.entities);

  function handleClick() {
    // dispatch the action creator (see below!)
    dispatch(fetchAstronauts());
  }

  const astronautsList = astronauts.map((astro) => (
    <li key={astro.id}>{astro.name}</li>
  ));

  return (
    <div>
      <button onClick={handleClick}>Get Astronauts</button>
      {astronautsList}
    </div>
  );
}

export default Astronauts;
```

```js
// ./src/features/astronauts/astronautsSlice.js
// Action Creators
export function fetchAstronauts(astronauts) {
  return {
    type: "astronauts/astronautsLoaded",
    payload: astronauts,
  };
}

// Reducers
const initialState = {
  entities: [], //array of astronauts
};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case "astronauts/astronautsLoaded":
      return {
        ...state,
        entities: action.payload,
      };

    default:
      return state;
  }
}
```

So if you look at the code above, you get a sense for what we are trying to do.
When a user clicks on the button, we call the `handleOnClick()` function. This
calls our action creator, the `fetchAstronauts()` function. The action creator then
hits the API, and returns an action with our data, which then updates the state
through the reducer.

While this might seem like it should work, in reality we have a big problem.

Fetch requests in JavaScript are _asynchronous_. That means if we make a fetch
request at the first line of our `fetchAstronauts()` function:

```js
export function fetchAstronauts() {
  const astronauts = fetch("http://api.open-notify.org/astros.json");
  return {
    type: "astronauts/astronautsLoaded",
    payload: astronauts,
  };
}
```

The code on the second line will start running _before the web request resolves
and we have a response that we can work with_.

A `fetch()` request returns something called a **Promise**. A Promise object is
an object that represents some value that will be available later. We can access
the data when the promise "resolves" and becomes available by chaining a
`then()` function onto our `fetch()` call.

```js
export function fetchAstronauts() {
  const astronauts = fetch(
    "http://api.open-notify.org/astros.json"
  ).then((response) => response.json());
  return {
    type: "astronauts/astronautsLoaded",
    payload: astronauts,
  };
}
```

Our `then()` function will run when the Promise that `fetch()` returns is
_resolved_, allowing us to access the response data and parse it into JSON. This
doesn't solve our problem though because the `fetchAstronauts()` function will still
return before the Promise is resolved.

There's another problem. Because retrieving data takes time, and because we
always want our `redux` store to reflect the current application state, we want
to represent the state of the application in between the user asking for data
and the application receiving the data. It's almost like each time a user asks
for data we want to dispatch two actions to update our state: one to place our
state as loading, and another to update the state with the data.

So these are the steps we want to happen when the user wishes to call the API:

1. Invoke `fetchAstronauts()`
2. Directly after invoking `fetchAstronauts()` dispatch an action to indicate that we are
   loading data.
3. Call the `fetch()` method, which runs, and returns a Promise that
   we are waiting to resolve.
4. When the Promise resolves, dispatch another action with a payload of the
   fetched data that gets sent to the reducer.

Great. So how do we do all of this?

## We Need Middleware

So we need a way to dispatch an action saying we are loading data, then to make
a request to the API, and then to wait for the response and then dispatch
another action with the response data.

Lucky for us, we can use some **middleware** for exactly that! Middleware, in
this case, will allow us to slightly alter the behavior of our actions, allowing
us to add in asynchronous requests. In this case, for middleware, we'll be using
Thunk.

To use `redux-thunk` you would need to install the NPM package:

```sh
npm install redux-thunk
```

Then, when you initialize the store in your `index.js` file, you can incorporate
your middleware like this:

```js
// src/index.js

import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { createStore, applyMiddleware } from "redux";
import thunkMiddleware from "redux-thunk";
import App from "./App";
import rootReducer from "./reducer";

const store = createStore(rootReducer, applyMiddleware(thunkMiddleware));

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById("root")
);
```

Notice that we imported in a new function `applyMiddleware()` from
`redux`, along with `thunk` from the `redux-thunk` package, and passed
in `applyMiddleware(thunk)` as a second argument to `createStore`.

We can also set up our app to use the Redux DevTools. We'll use another package, `redux-devtools-extension`, to help with the setup:

```sh
npm install redux-devtools-extension
```

Then update our `index.js` file like so:

```js
import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { createStore, applyMiddleware } from "redux";
import thunkMiddleware from "redux-thunk";
import { composeWithDevTools } from "redux-devtools-extension";
import App from "./App";
import rootReducer from "./reducer";

const composedEnhancer = composeWithDevTools(applyMiddleware(thunkMiddleware));

const store = createStore(rootReducer, composedEnhancer);

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById("root")
);
```

## Using Redux-Thunk Middleware

In the above code, we tell our store to use the `redux-thunk` middleware. This
middleware will do a couple of interesting things:

1. Thunk allows us to return a function inside of our action creator. Normally, our action
   creator returns a plain JavaScript object, so returning a function is a pretty
   big change.

2. That function receives the store's dispatch function as its argument. With
   that, we can dispatch multiple actions from inside that returned function.

Let's see the code and then we'll walk through it.

```js
// src/features/astronauts/astronautsSlice.js
export function fetchAstronauts() {
  return function (dispatch) {
    dispatch({ type: "astronauts/astronautsLoading" });
    fetch("http://api.open-notify.org/astros.json")
      .then((response) => response.json())
      .then((astronauts) =>
        dispatch({
          type: "astronauts/astronautsLoaded",
          payload: astronauts.people,
        })
      );
  };
}
```

So you can see above that we are returning a function and not an action, and
that the power we now get is the ability to dispatch actions from inside of the
returned function. So with that power, we first dispatch an action to indicate
that we are about to make a request to our API. Then we make the request. We do
not hit our `then()` function until the response is received, which means that
we are not dispatching our action of type `'astronauts/astronautsLoaded'` until
we receive our data. Thus, we are able to send along that data.

### Reviewing Everything Together

Let's review the whole application now with `redux` and `redux-thunk`
configured. First we have `index.js`, which now imports `redux-thunk` and
`applyMiddleware` and uses them when creating the Redux store:

```js
// ./src/index.js
import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { createStore, applyMiddleware } from "redux";
import thunkMiddleware from "redux-thunk";
import { composeWithDevTools } from "redux-devtools-extension";
import App from "./App";
import rootReducer from "./reducers";

const composedEnhancer = composeWithDevTools(applyMiddleware(thunkMiddleware));

const store = createStore(rootReducer, composedEnhancer);

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById("root")
);
```

The `Astronauts.js` component we showed earlier can remain the same — note that
although we've called a function `fetchAstronauts()`, no actual asynchronous
code is in the component. The component's main purpose is to render JSX. It uses
data from Redux via `useSelector()` and connects an `onClick` event to an
action through `useDispatch()`:

```js
// ./src/features/astronauts/Astronauts.js
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAstronauts } from "./astronautsSlice";

function Astronauts() {
  const dispatch = useDispatch();

  const astronauts = useSelector((state) => state.astronauts.entities);

  function handleClick() {
    dispatch(fetchAstronauts());
  }

  const astronautsList = astronauts.map((astro) => (
    <li key={astro.id}>{astro.name}</li>
  ));

  return (
    <div>
      <button onClick={handleClick}>Get Astronauts</button>
      {astronautsList}
    </div>
  );
}

export default Astronauts;
```

What happens when the `onClick` event is fired? All of that logic
is taken care of outside of the component, in our `fetchAstronauts()`
action:

```js
// src/features/astronauts/astronautsSlice.js
export function fetchAstronauts() {
  return function (dispatch) {
    dispatch({ type: "astronauts/astronautsLoading" });
    fetch("http://api.open-notify.org/astros.json")
      .then((response) => response.json())
      .then((astronauts) =>
        dispatch({
          type: "astronauts/astronautsLoaded",
          payload: astronauts.people,
        })
      );
  };
}
```

With Thunk configured, our actions can now _return_ a function. We must write
the function, but we know that `dispatch()` is passed in as an argument. Notice
in the code above that there are _two_ calls to `dispatch()`, first passing in
`{ type: 'astronauts/astronautsLoading' }` before the `fetch()` call, then
passing in `{ type: 'astronauts/astronautsLoaded', payload: astronauts }`
_inside_ `.then()`. By having both `dispatch()` calls, it is possible to know
just before our application sends a remote request, and then immediately after
that request is resolved.

We can update our reducer to include both `type`s and to also change a bit of
state to indicate if data is in the process of being fetched. We'll modify the
initial state to do this:

```js
// ./src/features/astronauts/astronautsSlice.js
const initialState = {
  entities: [], //array of astronauts
  status: "idle", //loading status for fetch
};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case "astronauts/astronautsLoaded":
      return {
        ...state,
        status: "idle",
        entities: action.payload,
      };
    case "astronauts/astronautsLoading":
      return {
        ...state,
        status: "loading",
      };
    default:
      return state;
  }
}
```

Now, we have a way to indicate in our app when data is being loaded! If `status`
is `'loading'`, we could display a loading message in our components.

### Summary

We saw that when retrieving data from APIs, we run into a problem where the
action creator returns an action before the data is retrieved. To resolve this,
we use a middleware called `redux-thunk`. `redux-thunk` allows us to return a
function inside of our action creator instead of a plain JavaScript object. That
returned function receives the store's dispatch function, and with that we are
able to dispatch multiple actions: one to place the state in a loading state,
and another to update our store with the returned data.
