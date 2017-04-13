# Async Redux

## Objectives

* Learn how to use action creator functions to make asynchronous web requests for data in __Redux__
* Understand why we need special middleware in order to make some action creator functions able to make asynchronous web requests.
* Learn how to use the __Redux Thunk__ middleware to make some actions asynchronous


## Introduction: Asynchronous Web Requests with Fetch and Promises

We're familiar with the __Redux__ pattern in which the store dispatches an action to the reducer, which then takes that information in an action object to make changes to state, in turn causing components to re-render with new data.

So far, however, we've dealt with "hard-coded" data, i.e. data that we set ourselves, usually inside an action creator function. Something like this:

```js
function fetchCats() {
  const cats = [
    {name: "Grumpy Cat", temperament: "grumpy"},
    {name: "Maru", temperament: "curious"},
    {name: "Lil' Bub", temperament: "little"}
  ];
  return {
    type: 'FETCH_CATS', 
    cats
  };
};
```

What happens though, when we're ready to pull in real live data from an external source like an API?

Well, we already know how to make a web request. We can using something like Javascript's native Fetch API to sent a web request:

```js
fetch('http://www.catapi.com')
```

So, can we simply make a `fetch` request inside our action creator function, instead of hard-coding in our data?  The code below, is a good attempt, but ultimately ends in failure and disappointment.  

```js
// ./src/App.js

import React, { Component } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { fetchCats } from '../actions/fetchCats'

class App extends Component {

  handleOnClick() {
    this.props.fetchCats()
  }

  render() {
    const cats = this.props.cats.map(cat => <li key={cat.id}>{cat.name}</li>);

    return(
      <div>
        <button onClick={(event) = this.handleOnClick(event)} />
        {cats}
      </div>
    );
  }
};

function mapDispatchToProps(dispatch){
  bindActionCreators(dispatch, {fetchCats: fetchCats})
}

function mapStateToProps(state){
  return {cats: state.cats}
}

export default connect(mapStateToProps, mapDispatchToProps)(App)


// ./src/actions/fetchCats.js
export function fetchCats() {
  const cats = fetch('http://www.catapi.com');
  return {
    type: 'FETCH_CATS', 
    cats
  };
};

// ./src/catsReducer.js
function catsReducer(state = [], action) {
  switch (action.type) {

    case 'FETCH_CATS':
      return action.cats

    default:
      return state;
  }
};
```

So if you look at the code above, you can a sense for what we are trying to do. When a user clicks on the button, we call the __handleOnClick()__ function. This calls our action creator, the __fetchCats()__ function. The action creator then hits the API, and returns an action with our data, which then updates the state through the reducer.

While this might seem like it should work, in reality we have a big problem.

Web requests in JavaScript are *asynchronous*. That means if we make a web request at the first line of our fetchCats function:

```js
export function fetchCats() {
  const cats = fetch('http://www.catapi.com');
  return {
    type: 'FETCH_CATS', 
    cats
  };
};
```

the code on the second line will start running *before the web request resolves and we have a response that we can work with*.

A __fetch()__ request returns a something called a **Promise**. A promise object is an object that represents some value that will be available later. We can access the data when the promise "resolves" and becomes available by chaining a __then()__ function onto our __fetch()__ call.

```js
export function fetchCats() {
  const cats = fetch('http://www.catapi.com').then(response => response.json())
  return {
    type: 'FETCH_CATS', 
    cats
  };
}
```

Our __then()__ function will run *when the promise that __fetch()__ returns is *resolved*, allowing us to access the response data and parse it into JSON.  This doesn't solve our problem though because the __fetchCats()__ function will still return before the promise is resolved.  

There's another problem. Because the retrieving data takes time, and because we always want our __Redux__ application to reflect the current application state, we want to represent the state of the application in between the user asking for data, and the application receiving the data. It's almost like each time a user asks for data we want to dispatch two actions to update our state: one to place our state as loading, and another to update the state with the data.  

So these are the steps we want to happen when the user wishes to call the API:
1. Invoke __fetchCats()__
2. Directly after invoking __fetchCats()__ we dispatch an action that we are loading data.
3. Then we call the __fetch()__ method, which runs, and returns a promise that we are waiting to resolve.
4. When the promise is resolved, we dispatch another action with a `type` and `pets` which is sent to the reducer.

Great. So how do we do all of this?

### We Need Middleware!

So we need a way to dispatch an action saying we are loading data, then to make a request to the api, and then to wait for the response and then dispatch another action with the response data.

Lucky for us, we can use some **middleware** for exactly that!

To use __Redux Thunk__ you would need to install the npm package:

```
npm install --save redux-thunk
```

Then, when you initialize the store in your `index.js` file, you can incorporate your middleware like this:

```js
// src/index.js

import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'redux';
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

## Using Redux-Thunk Middleware

We'll tell our store to use the __Redux Thunk__ middleware. This middleware will do a couple of interesting things. First, __Redux Thunk__ allows us to return a function inside of our action creator. Normally, our action creator returns a plain JavaScript object, so returning a function is a pretty big change. Second, that function inside of __Redux Thunk__ receives the store's dispatch function as it's argument. With that, we can dispatch multiple actions from inside that returned function.

Let's see the code and then we'll walk through it.

```js
// actions/fetchCats.js
export function fetchCats() {
  return (dispatch) => {
    return fetch('http://www.catapi.com')
      .then(response => response.json())
      .then(cats => dispatch({ type: 'ADD_CATS', cats }));
  };
}
```

So you can see above that we are returning a function and not an action, and that the power we now get is the ability to dispatch actions from inside of the returned function. So with that power, we first dispatch an action to state that we are about to make a request to our API. Then we make the request. We do not hit our __then()__ function until the response is received, this means that we are not dispatching our action of type 'ADD_CATS' until we receive our data. Thus we are able to send along that data.

### Summary

We saw that when retrieving data from APIs, we run into a problem where the action creator returns an action before the data is retrieved. To resolve this, we use a middleware called __Redux Thunk__. __Redux Thunk__ allows us to return a function inside of our action creator instead of a plain JavaScript object. That returned function receives the store's dispatch function, and with that we are able to dispatch multiple actions: one to place the state in a loading state, and another to update our store with the returned data.

<p class='util--hide'>View <a href='https://learn.co/lessons/redux-thunk-readme'>Redux Thunk Readme</a> on Learn.co and start learning to code for free.</p>
