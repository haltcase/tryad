# tryad &middot; [![Version](https://img.shields.io/npm/v/tryad.svg?style=flat-square&maxAge=3600)](https://www.npmjs.com/package/tryad) [![License](https://img.shields.io/npm/l/tryad.svg?style=flat-square&maxAge=3600)](https://www.npmjs.com/package/tryad) [![Travis CI](https://img.shields.io/travis/citycide/tryad.svg?style=flat-square&maxAge=3600)](https://travis-ci.org/citycide/tryad) [![JavaScript Standard Style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square&maxAge=3600)](https://standardjs.com)

<p align="center">
  <img src="https://raw.githubusercontent.com/citycide/tryad/master/.media/logo.png" width="500" alt="tryad">
</p>

> Monadic mashup of Maybe & Either that represents a value, nothing, or an error.

There are a few major reasons for `tryad` to exist:

* most existing Maybe / Option / Either / Result types in JavaScript don't
  seamlessly interop with Promises
* if the Maybe contains an array, you have to `map` inside a `map` because it
  doesn't dispatch
* `toMaybe` and `toEither` become unnecessary if the type simply has a third branch
  to cover exceptions

So `tryad` attempts to create a new type that incorporates all of this - replacing
both `null`-ish checks and `try`/`catch` while working well with Promises.

## installation

```console
npm i tryad
```

## usage

```js
import tryad from 'tryad'
import { resolve } from 'path'

const loadPlugin = atPath => {
  return require(atPath).initialize()
}

const plugin = { name: 'a-plugin' /*, path: './plugin.js' */ }
const loaded = tryad(plugin.path)
  .map(path => resolve(process.cwd(), path))
  .try(absolute => loadPlugin(absolute))
  .unwrap(
    // `loaded` becomes equal to the return value of
    // whichever branch we hit here in `unwrap`
    Some => 'loaded the plugin'
    None => 'plugin.path was not defined, so nothing was executed'
    Fail => 'a wild error appeared! ' + Fail.message
  )

// in this case `path` is not defined, so we get a `None`:
// -> 'plugin.path was not defined, so nothing was executed'
```

Or if you're all about that async, let's check out Promises!

```js
import tryad from 'tryad'
import { readJson } from 'fs-extra'

;(async () => {
  const result = await tryad('./package.json')
    // returning a Promise here like `readJson` does
    // makes the chain's result become asynchronous
    .try(path => readJson(path))
    .map(pkg => pkg.keywords)
    // methods dispatch to the inner value, so this
    // maps over each keyword in the array
    .map(key => key.toLowerCase())
    .filter(key => key === 'maybe')
    .unwrap(
      Some => 'found the maybe keyword',
      None => 'did not find the maybe keyword',
      Fail => 'an error occurred! ' + Fail.message
    )

  /*...*/
})()
```

And remember that if at any point a transformation causes a nil / falsy value
to be returned or if `.try()` throws an Error, the following transformations
will not be executed. This makes null handling _very_ easy - in this case
the chain would 'skip forward' to the `unwrap` call.

## api

### `tryad`

```js
tryad(value)
```

Returns a new object that is either a `None` if `value == null` or a `Some`
containing `value` otherwise.

> Expand the following sections to see the full documentation.

<details>
  <summary>static methods</summary>

#### `of`

```js
tryad.of(value)
```

Alternate constructor that checks for truthiness rather than loose equality to `null`.

#### `try`

```js
tryad.try(value, fn)
```

Shortcut for `tryad.of(value).try(fn)`. If `value != null` it will be applied
to the function `fn`, and any errors will be caught to transform the `tryad`
into a `Fail`. `fn` is only executed on a `Some`.

> **Arguments**

  * `value: any`
  * `fn: value -> any`

    Function that will receive `value` as its only parameter. All errors are
    caught and returned in a new `Fail` object.

> **Returns** `Some | None | Fail`

#### `async`

```js
tryad.async(value)
```

Asynchronous version of the `tryad` constructor that accepts `value` as a
Promise, or wraps it in one if it isn't already a Promise.

#### `async.of`

```js
tryad.async.of(value)
```

Asynchronous version of the `tryad.of` constructor that accepts `value` as a
Promise, or wraps it in one if it isn't already a Promise.

#### `isSomeLike`

```js
tryad.isSomeLike(value)
```

Useful for checking if an arbitrary object is a `Some`, meaning
it is not `== null` and has an `isSome` method that returns `true`.

> **Arguments**

  * `value: any`

> **Returns** `Boolean`

#### `isNoneLike`

```js
tryad.isNoneLike(value)
```

Useful for checking if an arbitrary object is a `None`, meaning
it is not `== null` and has an `isNone` method that returns `true`.

> **Arguments**

  * `value: any`

> **Returns** `Boolean`

#### `isFailLike`

```js
tryad.isFailLike(value)
```

Useful for checking if an arbitrary object is a `Fail`, meaning
it is not `== null` and has an `isFail` method that returns `true`.

> **Arguments**

  * `value: any`

> **Returns** `Boolean`

</details>

<details>
  <summary>instance methods</summary>

These methods are callable on instances of a `Some`, `None`, or `Fail`.
Examples will use the name `box` to represent one of these instances.

#### `filter`

```js
box.filter(fn)
```

`fn` will only be executed if `box` is a `Some`, and receives its value as its
only argument. If it returns falsy, a `None` will be returned. If it returns
truthy, the current instance is returned as-is. Dispatches to `value.filter()`
if it is callable.

> **Arguments**

  * `fn: (value) -> Boolean`

> **Returns** `Some | None`

#### `flatMap`

```js
box.flatMap(fn)
```

`fn` will only be executed if `box` is a `Some`, and receives its value as its
only argument. Any returned `tryad` will be absorbed. Dispatches to `value.flatMap()`
if it is callable.

> **Arguments**

  * `fn: (value) -> Some | None | Fail`

> **Returns** `Some | None | Fail`

#### `forEach`

```js
box.forEach(fn)
```

`fn` will only be executed if `box` is a `Some`, and receives its value as its
only argument. This method ends the chain. Dispatches to `value.forEach()` if
it is callable.

> **Arguments**

  * `fn: (value) -> any`

> **Returns** `undefined`

#### `includes`

```js
box.includes(other)
```

If `box` is a Some, compares `other` against the value contained within `box`
and returns `true` if they are equal. Returns `false` if `box` is not a `Some`.
Dispatches to `value.includes()` if it is callable.

> **Returns** `Boolean`

#### `map`

```js
box.map(fn)
```

`fn` will only be executed if `box` is a `Some`, and receives its value as its
only argument. The return value will be used to construct a new `tryad`. If
`fn` will return a `tryad`, you probably want to use `flatMap` instead.
Dispatches to `value.map()` if it is callable.

> **Arguments**

  * `fn: (value) -> any`

> **Returns** `Some | None`

#### `orElse`

```js
box.orElse(fn)
```

`fn` is only called if `box` is a `None` or a `Fail`. If `box` is a `Fail`,
`fn` will receive the error contained within.

> **Arguments**

  * `fn: (error?) -> any`

> **Returns** `Some | any`

#### `orSome`

```js
box.orSome(other)
```

Returns the value contained within `box` if it is a `Some`, or returns
`other` if it is a `None` or a `Fail`. This method ends the chain.

> **Arguments**

  * `other: any`

> **Returns** `any`

#### `some`

```js
box.some()
```

Returns the value contained within `box`. Throws if `box` is not a `Some`, so it's safer to use [`orSome`](#-orSome-). This method ends the chain.

> **Returns** `any`

#### `try`

```js
box.try(fn)
```

Attempts to call `fn(value)` and catches any error that occurs, returning a
`Fail` with the error. Not executed if `box` is not a `Some`.

> **Arguments**

  * `fn: value -> Some | None | Fail`

> **Returns** `Some | None | Fail`

#### `unwrap`

```js
box.unwrap(ifSome, ifNone, ifFail)
```

Calls whichever function corresponds to the instance type and returns its
value.

> **Arguments**

  * `ifSome: value -> any`
  * `ifNone: () -> any`
  * `ifFail: error -> any`

> **Returns** `any`

</details>

## see also

- [`param.macro`](https://github.com/citycide/param.macro) - Babel plugin for compile time partial application & lambda parameters

## contributing

Pull requests and any [issues](https://github.com/citycide/tryad/issues)
found are always welcome.

1. Fork the project, and preferably create a branch named something like `feat-make-better`
2. Modify the source files as needed
3. Make sure all tests continue to pass, and it never hurts to have more tests
4. Push & pull request! :tada:

## license

MIT © [Bo Lingen / citycide](https://github.com/citycide)
