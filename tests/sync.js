import test from 'ava'
import tryad from '../dist'

test('boxes nil & non-nil values', t => {
  ;[null, undefined]
    .map(tryad)
    .map(result => {
      t.true(result.isNone())
      t.false(result.isSome())
      t.false(result.isFail())
    })

  ;[true, 0, 'hello', [1, 2, 3], {}, NaN]
    .map(tryad)
    .map(result => {
      t.true(result.isSome())
      t.false(result.isNone())
      t.false(result.isFail())
    })
})

test('`of()` constructor uses falsy semantics instead of nil-like', t => {
  ;[null, undefined, false, 0, NaN]
    .map(tryad.of)
    .forEach(result => {
      t.true(result.isNone())
      t.false(result.isSome())
      t.false(result.isFail())
    })
})

test('provides `isNoneLike()`, `isSomeLike()`, `isFailLike()` static methods', t => {
  t.true(tryad.isNoneLike(tryad.none))
  t.false(tryad.isNoneLike({}))

  t.true(tryad.isSomeLike(tryad('value')))
  t.false(tryad.isSomeLike(tryad.none))

  const fail = tryad.try('woops', v => { throw new Error(v) })
  t.true(tryad.isFailLike(fail))
  t.false(tryad.isFailLike(tryad.none))
  t.false(tryad.isFailLike(tryad('value')))
})

test('`some()` retrieves non-nil values', t => {
  ;[
    'hello world',
    [1, 2, 3, 4, 5],
    { someKey: 'some value' },
    new Date()
  ].forEach(value => {
    const result = tryad(value)
    t.true(result.isSome())
    t.false(result.isNone())
    t.false(result.isFail())
    t.deepEqual(result.some(), value)
  })
})

test('`some()` throws when called on None or Fail', t => {
  t.throws(() => tryad(null).some())
  t.throws(() => tryad.try('foo', v => { throw new Error(v) }).some())
})

test('`includes()` compares the given value against the boxed value', t => {
  t.false(tryad('initial').includes('final'))
  t.true(tryad('initial').includes('initial'))
})

test('`orElse()` handler is not executed on a Some', t => {
  const hello = tryad('hello')
  let untouched = true
  hello.orElse(() => (untouched = false))
  t.true(untouched)
})

test('`orSome()` handler returns the boxed value', t => {
  const hello = tryad('hello')
  t.is(hello.orSome('other'), 'hello')
})

test('methods dispatch to Some.value', t => {
  let result = tryad([1, 2, 3, 4, 5]).map(v => v * 2)
  t.deepEqual(result.some(), [2, 4, 6, 8, 10])

  result = result.filter(v => v > 5)
  t.deepEqual(result.some(), [6, 8, 10])

  result = result.includes(8)
  t.is(result, true)
})

test('`map()` vs `flatMap()` with a returned Some result', t => {
  const mapped = tryad('hello').map(v => tryad('world'))
  const flatMapped = tryad('hello').flatMap(v => tryad('world'))

  t.is(mapped.some().some(), 'world')
  t.is(flatMapped.some(), 'world')
})

test('`flatMap()` converts nil values to None', t => {
  let result = tryad('hello').flatMap(() => null)
  t.is(result, tryad.none)

  result = tryad('hello').flatMap(() => undefined)
  t.is(result, tryad.none)
})

test('`filter()` returning Some continues the chain', t => {
  const upper = tryad('hello')
    .map(v => v.trim())
    .filter(v => v.includes('o'))
    .map(v => v.toUpperCase())

  t.is(upper.some(), 'HELLO')
})

test('`filter()` returning None prevents later transformations', t => {
  const result = tryad('world')
    .map(v => v.trim())
    .filter(v => v.includes('h'))
    .map(v => v.toUpperCase())

  t.is(result, tryad.none)
})

test('`forEach()` callback is only executed on Some values', t => {
  let untouched = true
  let result = tryad('hello').forEach(() => (untouched = false))
  t.false(untouched)
  t.is(result, undefined)

  untouched = true
  result = tryad()
    .forEach(() => (untouched = false))

  result = tryad()
    .try('nope', value => { throw new Error(value) })
    .forEach(() => (untouched = false))

  t.true(untouched)
})

test('`try().orElse()` pattern for error handling', t => {
  const handler = value => {
    if (value !== 'final value') {
      throw new Error('expected final value!')
    }

    return 'affirmative'
  }

  let result = tryad('initial value')
    .try(handler)
    .orElse(e => {
      t.is(e.message, 'expected final value!')
      return 'default value'
    })

  t.is(result, 'default value')

  result = tryad('final value')
    .try(handler)
    .some()

  t.is(result, 'affirmative')
})

test('`unwrap()` for branching on kind', t => {
  const handlers = [
    Some => Some.split(''),
    None => 'default',
    Fail => Fail.message
  ]

  const some = tryad('hello')
    .map(v => v.toUpperCase())
    .unwrap(...handlers)

  const none = tryad()
    .map(v => v.toUpperCase())
    .unwrap(...handlers)

  const fail = tryad('error')
    .try(v => { throw new Error(v) })
    .unwrap(...handlers)

  t.deepEqual(some, ['H', 'E', 'L', 'L', 'O'])
  t.is(none, 'default')
  t.is(fail, 'error')
})

test('becomes async if any transformation returns a Promise', async t => {
  let promise = tryad('hello').map(v => Promise.resolve(v)).some()
  t.true(promise instanceof Promise)
  t.is(await promise, 'hello')

  promise = tryad('hello').flatMap(async v => tryad('what')).some()
  t.is(await promise, 'what')
})
