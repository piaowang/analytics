/**
 * Created on 25/02/2017.
 */

const toString = Object.prototype.toString
const primitiveType = v => toString.call(v).slice(8, -1).toLowerCase().replace('async', '')

const has = (propType) => propType !== 'undefined' && propType !== 'null'

const stringify = (v) => JSON.stringify(v)

const equal = (x, y) => {
  if (x === y) {
    return x !== 0 || 1 / x === 1 / y
  } else {
    return x !== x && y !== y
  }
}

/**
 * @typedef {Object} CheckedResult
 * @property {boolean} success
 * @property {string} message
 */

/**
 * @callback Checker
 * @param {Object} props
 * @param {string} name
 * @return {CheckedResult}
 */


/**
 * @typedef {function} PrimitiveTypeChecker
 * @type {Checker}
 * @property {Checker} isRequired
 */

/**
 * @callback CheckerFactory
 * @param {*} expected
 * @return {PrimitiveTypeChecker}
 */

/**
 * @param {String} expected
 * @return {PrimitiveTypeChecker}
 */
const createPrimitiveTypeChecker = expected => {
  const createChecker = (required, props, name) => {
    const value = props[name]
    const type = primitiveType(value)
    const unExist = !has(type)
    const isExpect = type === expected
    const result = {
      success: required ? isExpect : unExist || isExpect,
      message: null
    }
    if (required && unExist) {
      result.message = `Property [${name}] excepted type is [${expected}] and required.`
    } else if (!isExpect) {
      result.message = `Property [${name}] excepted type is [${expected}]. But received type is [${type}]. Received value is ${stringify(value)}`
    }
    return result
  }

  const validator = createChecker.bind(null, false)
  validator.isRequired = createChecker.bind(null, true)
  return validator
}

/**
 * @param {Array} expected
 * @type {CheckerFactory}
 */
const createOneOfChecker = expected => {
  if ('array' !== primitiveType(expected)) {
    throw new TypeError('Expected must a Array')
  }

  const ExpectedToString = stringify(expected)
  const createChecker = (required, props, name) => {
    const value = props[name]
    const type = primitiveType(value)
    const unExist = !has(type)
    const match = expected.some(v => equal(value, v))

    const result = {
      success: required ? match : unExist || match,
      message: null
    }

    if (required && unExist) {
      result.message = `Property [${name}] is required.`
    } else if (!match) {
      result.message = `Property [${name}] excepted one of ${ExpectedToString}. But received ${stringify(value)}.`
    }

    return result
  }
  const validator = createChecker.bind(null, false)
  validator.isRequired = createChecker.bind(null, true)
  return validator
}

/**
 * @param {Array<Checker>} expected
 * @type {CheckerFactory}
 */
const createOneOfTypesChecker = expected => {
  if ('array' !== primitiveType(expected))
    throw new TypeError('Expected must a Array')

  if (expected.some(checker => 'function' !== primitiveType(checker)))
    throw new TypeError('Checker must a function')

  return (props, name) => {
    const errors = []
    const success = expected.some((checker) => {
      const result = checker(props, name)
      if (!result.success) errors.push(result.message)
      return result.success
    })
    return {
      success,
      message: success ? null : errors.join('; ')
    }
  }
}

/**
 * @param {Array<Checker>} expected
 * @type {CheckerFactory}
 */
const createInOfChecker = expected => {
  if ('array' !== primitiveType(expected)) throw new TypeError('Expected must Array')

  const ExpectedToString = stringify(expected)

  const createChecker = (required, props, name) => {
    const value = props[name]
    const type = primitiveType(value)
    const unExist = !has(type)
    const result = { success: true, message: null }

    if (required && unExist) {
      result.success = false
      result.message = `Property [${name}] is required.`
      return result
    }

    if (unExist) {
      return result
    }

    if ('array' !== primitiveType(value)) {
      result.success = false
      result.message = `Property [${name}] TypeError: The value that in InOfChecker must array.`
      return result
    }

    const notFound = []
    const match = value.some(v => {
      let m = expected.some(e => equal(v, e))
      if (!m) notFound.push(v)
      return m
    })

    result.success = match
    result.message = match ? null : `Property [${name}] excepted in ${ExpectedToString}. But not find ${stringify(notFound)}`
    return result
  }

  const validator = createChecker.bind(null, false)
  validator.isRequired = createChecker.bind(null, true)
  return validator
}

/**
 * @param {Array<Checker>} expected
 * @type {CheckerFactory}
 */
const createInTypeOfChecker = expected => {
  if ('array' !== primitiveType(expected))
    throw new TypeError('Expected must Array')

  if (expected.some(checker => 'function' !== primitiveType(checker)))
    throw new TypeError('Checker must function')

  return (props, name) => {
    const errors = []
    const value = props[name]

    if ('array' !== primitiveType(value))
      throw new TypeError('The value that in InTypeOfChecker must array')

    const success = value.some(v => {
      const gen = { [name]: v }
      return expected.some(checker => {
        const result = checker(gen, name)
        if (!result.success) errors.push(result.message)
        return result.success
      })
    })

    return {
      success,
      message: success ? null : errors.join('; ')
    }
  }
}

const PropTypes = {
  string: createPrimitiveTypeChecker('string'),
  number: createPrimitiveTypeChecker('number'),
  object: createPrimitiveTypeChecker('object'),
  array: createPrimitiveTypeChecker('array'),
  bool: createPrimitiveTypeChecker('boolean'),
  func: createPrimitiveTypeChecker('function'),
  oneOf: createOneOfChecker,
  oneOfType: createOneOfTypesChecker,
  inOf: createInOfChecker,
  inTypeOf: createInTypeOfChecker
}

/**
 * @callback CheckerDefine
 * @params {Object} props
 * @return {CheckedResult}
 */

/**
 * @param types
 * @return {CheckerDefine}
 */
const defineTypes = types => {
  if ('object' !== primitiveType(types))
    throw new TypeError('Types must object')

  const names = Object.keys(types)

  if (names.some(name => primitiveType(types[name]) !== 'function'))
    throw new TypeError('Types checker must Function')

  function checker (props) {
    const errors = []
    names.forEach(name => {
      const checker = types[name]
      const isChecker = checker.isChecker
      const result = isChecker ? checker(props) : checker(props, name)

      if (!result.success) {
        if (isChecker) {
          result.message.map(m => errors.push(m))
        } else {
          errors.push(result.message)
        }
      }
    })
    return { success: errors.length < 1, message: errors }
  }

  checker.isChecker = true
  return checker
}

export { defineTypes, PropTypes }
