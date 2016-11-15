# Async Redux

## Objectives

* Learn how to use action creator functions to make asynchronous web reqeusts for data in Redux
* Understand why we need special middleware in order to make some action creator functions able to make asynchronous web requests.
* Learn how to use the Redux Promise middleware to make some actions asynchronous


## Introduction: Aynschronous Web Requests with Fetch and Promises

We're familiar with the Redux of pattern in which the store dispatches an action to the reducer, which takes the information in that action object to make changes to state, in turn causing components to re-render with new data. 

So far, however, we've dealt with "hard-coded" data, i.e. data that we set ourselves, usually inside an action creator function. Something like this:

```js
// actions

function fetchCats() {
  const cats = [
    {name: "Grumpy Cat", temperament: "grumpy"},
    {name: "Maru", temperament: "curious"},
    {name: "Lil' Bub", temperament: "little"}
  ]

  return {type: 'FETCH_CATS', payload: cats}
}
```

What happens though, when we're ready to pull in real live data from an external source like an API?

Well, we already know how to make a web request. We can using something like Javascript's native Fetch API to sent a web request:

```js
fetch('http://www.catapi.com')
```

So, can we simpley make a `fetch` request inside our action creator function, instead of hard-coding in our data?

```js
function fetchCats() {
  const cats = fetch('http://www.catapi.com')

  return {type: 'FETCH_CATS', payload: cats}
}
```

While this might seem like it should work, in reality we have a big problem. 

Web requests in JavaScript are *asynchronous*. That means if we make a web request on line 1:

``js
const cats = fetch('http://www.catapi.com')
return {type: 'FETCH_CATS', payload: cats}
```

the code on line 2 will start running *before the web request resolves and we have a response that we can work with*. 

A `fetch` request returns a something called a **Promise**. A promise object is an object that represents somve value that will be available later. We can access the data when the promise "resolves" and becomes availalbe by chaingin a `then` function onto our `fetch` call.

``js
const cats = fetch('http://www.catapi.com').then(response => {
  return response.json()
})
return {type: 'FETCH_CATS', payload: cats}
```

Our `then` function will run *when the promise that `fetch` returns is resolved*, allowing us to access the response data and parse it into JSON. 

This doesn't solve our asynchronicity problem though...

### We Need MiddleWare! 

Let's think about how we dispatch actions to our reducers. We might call something like:

```js
store.dispatch(fetchCats())
```

The `dispatch` function is taking in an argument of the invocation of our `fetchCats` action creator function. So, `fetchCats` is invoked, and the return value of that function is passed to our reducer. 

So, if our `fetchCats` action looks like this:

```js
function fetchCats() {
  const cats = fetch('http://www.catapi.com').then(response => {
    return response.json()
  })
  return {type: 'FETCH_CATS', payload: cats}
}
```

Then the order in which our code will actually execute is:

1. Invoke `fetchCats`
2. The `fetch` request runs, and returns a promise that we are waiting to resolve.
3. While we wait for our promise to resolve, and the `then` function to run, the rest of our code continues!
4. The function returns the object with a key of `type`, set to `'FETCH_CATS'`, and a key of `payload`, which is **set to a Promise object that has not yet resolved**. 
5. This little object with `type` and `payload` is sent to the reducer. The reducer can't resolve your Promise for you, or access the data that we ultimately hoped to retreive from the response to our web request, so...our app breaks! Oh no!

If only there was some way to ensure that this Promise would resolve, and our `then` function run, *before we hit the reducer*. 

Lucky for us, we can use some **middleware** for exactly that!

## Using Redux-Promise Middleware

We'll tell our store to use the Redux-Promise middleware. This middleware will step in after an action creator function has been called *but before the result of that function gets passed to the reducer*. The middleware receive the return of the action creator function, which is our object with a key of `type` and `payload`. If the payload is an unresolved promise. It will wait until the promise is resolved and then create a copy of our action object, setting `payload` to the result of the resolved promise. Only then will it pass that object along to the reducer. 

Pretty cool, right? Let's take a look at how we implement it.

### Giving the MiddleWare to the Store

We need to install the Redux-Promise package:

```
npm install --save redux-promise
```

Then, when you initialize the store in your `index.js` file, you can incorporate your middleware like this:

```js
// src/index.js

import React from 'react';
import ReactDOM from 'react-dom';
import {Provider} from 'redux'
import { createStore, applyMiddleware } from 'redux';
import ReduxPromise from 'redux-promise'
import rootReducer from './reducers';

const store = createStore(rootReducer, applyMiddleware(ReduxPromise));

ReactDOM.render(
  <Provider store={store} >
    <App />
  </Provider>, document.getElementById('container')
)
```

Then, make sure that your action creator function can properly resolve a Promise:

```js
function fetchCats() {
  const cats = fetch('http://www.catapi.com').then(response => {
    return response.json()
  }).then(cats => {
    return cats
  })
  return {type: 'FETCH_CATS', payload: cats}
}
```

And that's it!





