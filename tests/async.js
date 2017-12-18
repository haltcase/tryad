import test from 'ava'
import tryad from '../dist'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

test('boxes nil & non-nil values', async t => {
  for (const nil of [null, undefined]) {
    const result = tryad(Promise.resolve(nil))
    t.true(await result.isNone())
    t.false(await result.isSome())
    t.false(await result.isFail())
  }

  for (const falsy of [true, 0, 'hello', [1, 2, 3], {}, NaN]) {
    const result = tryad(Promise.resolve(falsy))
    t.true(await result.isSome())
    t.false(await result.isNone())
    t.false(await result.isFail())
  }
})

test('`of()` constructor uses falsy semantics instead of nil-like', async t => {
  for (const falsy of [null, undefined, false, 0, NaN]) {
    const result = tryad.of(Promise.resolve(falsy))
    t.true(await result.isNone())
    t.false(await result.isSome())
    t.false(await result.isFail())
  }
})

test('`some()` retrieves non-nil values', async t => {
  for (const value of [
    'hello world',
    [1, 2, 3, 4, 5],
    { someKey: 'some value' },
    new Date()
  ]) {
    const result = tryad.async(value)
    t.true(await result.isSome())
    t.false(await result.isNone())
    t.false(await result.isFail())
    t.deepEqual(await result.some(), value)
  }
})

test('`some()` rejects when called on None or Fail', async t => {
  await t.throws(tryad.async(null).some())
  await t.throws(
    tryad.try(
      Promise.resolve('foo'),
      v => Promise.reject(new Error(v))
    ).some()
  )
})

test('`includes()` compares the given value against the boxed value', async t => {
  t.false(await tryad.async('initial').includes('final'))
  t.true(await tryad.async('initial').includes('initial'))
})

test('async transformations work equivalently to the sync versions', async t => {
  const result = await tryad.async('initial')
    .map(async value => {
      await sleep(15)
      return value.split('')
    })
    .map(async array => {
      await sleep(10)
      return array.reverse()
    })
    .filter(async array => {
      await sleep(5)
      return array.length < 3
    })
    .flatMap(async array => {
      await sleep(2)
      return tryad(array.join('-'))
    })
    .orSome('final')

  t.is(result, 'l-a-i-t-i-n-i')
})

test('methods dispatch to Some.value', async t => {
  let result = await tryad([1, 2, 3, 4, 5]).map(v => v * 2)
  t.deepEqual(result.some(), [2, 4, 6, 8, 10])

  result = await result.filter(v => v > 5)
  t.deepEqual(result.some(), [6, 8, 10])

  result = await result.includes(8)
  t.is(result, true)
})
