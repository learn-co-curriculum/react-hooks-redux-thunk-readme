# Asynchronous Web Requests with Using Thunk and Redux

## Objectives

* Learn how to use action creator functions to make asynchronous web requests
  for data in `Redux`
* Understand why we need special middleware in order to make some action creator
  functions able to make asynchronous web requests.
* Learn how to use the __Redux Thunk__ middleware to make some actions
  asynchronous

## Introduction

Part of the value of using Redux is that it provides a centralized way to
control the data of an application. In a standard React + Redux application, any
child component can connect to the store directly from anywhere in the app. This
allows us to keep many of our React components simple &mdash; no need for
passing props through many nested components, no need to use component `state`
to keep track of all the data. A of code that would normally be stored in React
components can be removed or replaced.

With Redux, we can focus more on presentation in our React components, and use
actions and reducers to handle the logic of organizing data. In following with
this pattern, we'll be discussing a package that works in conjunction with
Redux: Thunk.

Thunk handles asynchronous calls when working with Redux - Think for a moment:
we have Redux handling all our app's data. So far, it's all be hard-coded
data, i.e. data that we set ourselves. It would be great if could start getting
data from other sources.

Well, if we had a server or an API, we could _fetch_ some remote data, but we're
presented with a familiar problem $mdash; we've just removed a lot of logic from
our components and now we're going to add more logic? Specifically, we're going
to fetch data we'll likely want to keep in our Redux store - adding code to our
components seems to be a step backwards.

With Thunk, we can incorporate asynchronous code in with our Redux actions. This
allows us to continue keeping our components relatively simple and more focused on
presentation. In this lesson, we're going to go through what Thunk is and how it
is implemented with Redux.

## Trying to Sent an Asynchronous Request in Redux

We're familiar with the `Redux` pattern in which the store dispatches an
action to the reducer, which then takes that information in an action object to
make changes to state, in turn causing components to re-render with new data.

Going back to hard-coded examples, in previous lessons, we populated our store
using data inside an action creator function. Something like this:

```js
function fetchAstronauts() {
  const astronauts = [
    {name: "Neil Armstrong", craft: "Apollo 11"},
    {name: "Buzz Aldrin", craft: "Apollo 11"},
    {name: "Michael Collins", craft: "Apollo 11"}
  ];
  return {
    type: 'FETCH_ASTRONAUTS',
    astronauts
  };
};
```

What happens though, when we're ready to pull in real live data from an external
source like an API?

Well, we already know how to make a web request. We can use something like
JavaScript's native Fetch API to sent a web request:

```js
fetch('http://api.open-notify.org/astros.json')
```

So, can we simply make a `fetch` request inside our action creator function
instead of hard-coding our data? The code below is a good attempt, but it
ultimately ends in failure and disappointment:

```js
// ./src/App.js

import React, { Component } from 'react'
import { connect } from 'react-redux'
import { fetchAstronauts } from '../actions/fetchAstronauts'

class App extends Component {

  handleOnClick() {
    this.props.fetchAstronauts()
  }

  render() {
    const astronauts = this.props.astronauts.map(astro => <li key={astro.id}>{astro.name}</li>);

    return(
      <div>
        <button onClick={(event) = this.handleOnClick(event)} />
        {astronauts}
      </div>
    );
  }
};

function mapDispatchToProps(dispatch){
  return { fetchAstronauts: () => dispatch(fetchAstronauts()) }
}

function mapStateToProps(state){
  return {astronauts: state.astronauts}
}

export default connect(mapStateToProps, mapDispatchToProps)(App)

// ./src/actions/fetchAstronauts.js
export function fetchAstronauts() {
  const astronauts = fetch('http://api.open-notify.org/astros.json');
  return {
    type: 'FETCH_ASTRONAUTS',
    astronauts
  };
};

// ./src/astronautsReducer.js
function astronautsReducer(state = [], action) {
  switch (action.type) {

    case 'FETCH_ASTRONAUTS':
      return action.astronauts

    default:
      return state;
  }
};
```

So if you look at the code above, you get a sense for what we are trying to do.
When a user clicks on the button, we call the `handleOnClick()` function. This
calls our action creator, the `fetchAstronauts()` function. The action creator then
hits the API, and returns an action with our data, which then updates the state
through the reducer.

While this might seem like it should work, in reality we have a big problem.

Web requests in JavaScript are *asynchronous*. That means if we make a web
request at the first line of our `fetchAstronauts()` function:

```js
export function fetchAstronauts() {
  const astronauts = fetch('http://api.open-notify.org/astros.json');
  return {
    type: 'FETCH_ASTRONAUTS',
    astronauts
  };
};
```

The code on the second line will start running *before the web request resolves
and we have a response that we can work with*.

A `fetch()` request returns something called a **Promise**. A Promise object is
an object that represents some value that will be available later. We can access
the data when the promise "resolves" and becomes available by chaining a
`then()` function onto our `fetch()` call.

```js
export function fetchAstronauts() {
  const astronauts = fetch('http://api.open-notify.org/astros.json')
                      .then(response => response.json())
  return {
    type: 'FETCH_ASTRONAUTS',
    astronauts
  };
}
```

Our `then()` function will run when the Promise that `fetch()` returns is
*resolved*, allowing us to access the response data and parse it into JSON. This
doesn't solve our problem though because the `fetchAstronauts()` function will still
return before the Promise is resolved.

There's another problem. Because retrieving data takes time, and because we
always want our `Redux` application to reflect the current application state,
we want to represent the state of the application in between the user asking for
data, and the application receiving the data. It's almost like each time a user
asks for data we want to dispatch two actions to update our state: one to place
our state as loading, and another to update the state with the data.

So these are the steps we want to happen when the user wishes to call the API:

1. Invoke `fetchAstronauts()`
2. Directly after invoking `fetchAstronauts()` we dispatch an action that we are
   loading data.
3. Then we call the `fetch()` method, which runs, and returns a Promise that
   we are waiting to resolve.
4. When the Promise resolves, we dispatch another action with a `type` and
   `astronauts` that gets sent to the reducer.

Great. So how do we do all of this?

## We Need Middleware

So we need a way to dispatch an action saying we are loading data, then to make
a request to the API, and then to wait for the response and then dispatch
another action with the response data.

Lucky for us, we can use some **middleware** for exactly that! Middleware, in
this case, will allow us to slightly alter the behavior of our actions, allowing
us add in asynchronous requests. In this case, for middleware, we'll be using
Thunk.

To use __Redux Thunk__ you would need to install the NPM package:

```sh
npm install --save redux-thunk
```

Then, when you initialize the store in your `index.js` file, you can incorporate
your middleware like this:

```js
// src/index.js

import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import rootReducer from './reducers';

const store = createStore(rootReducer, applyMiddleware(thunk));

ReactDOM.render(
  <Provider store={store} >
    <App />
  </Provider>, document.getElementById('container')
)
```

Notice that we imported in a new function, `applyMiddleware()`, from
`react-redux`, along with `thunk` from the `redux-thunk` package and pass
in `applyMiddleware(thunk)` as a second argument to `createStore`.

## Using Redux-Thunk Middleware

In the above code, we tell our store to use the Thunk middleware. This
middleware will do a couple of interesting things. First, Thunk allows
us to return a function inside of our action creator. Normally, our action
creator returns a plain JavaScript object, so returning a function is a pretty
big change. Second, that function inside of Thunk receives the store's
dispatch function as its argument. With that, we can dispatch multiple actions
from inside that returned function.

Let's see the code and then we'll walk through it.

```js
// actions/fetchAstronauts.js
export function fetchAstronauts() {
  return (dispatch) => {
    dispatch({ type: 'START_ADDING_ASTRONAUTS_REQUEST' });
    return fetch('http://api.open-notify.org/astros.json')
      .then(response => response.json())
      .then(astronauts => dispatch({ type: 'ADD_ASTRONAUTS', astronauts }));
  };
}
```

So you can see above that we are returning a function and not an action, and
that the power we now get is the ability to dispatch actions from inside of the
returned function. So with that power, we first dispatch an action to state that
we are about to make a request to our API. Then we make the request. We do not
hit our `then()` function until the response is received, this means that we
are not dispatching our action of type 'ADD_ASTRONAUTS' until we receive our data.
Thus, we are able to send along that data.

### Summary

We saw that when retrieving data from APIs, we run into a problem where the
action creator returns an action before the data is retrieved. To resolve this,
we use a middleware called Thunk. Thunk allows us to return a function inside of
our action creator instead of a plain JavaScript object. That returned function
receives the store's dispatch function, and with that we are able to dispatch
multiple actions: one to place the state in a loading state, and another to
update our store with the returned data.

<p class='util--hide'>View <a href='https://learn.co/lessons/redux-thunk-readme'>Redux Thunk Readme</a> on Learn.co and start learning to code for free.</p>
