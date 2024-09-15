/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2017/12/23
 * @description
 */

import Action from './actions'
import namespace from './namespace'
import map from './map'
import Resources from './resources'
import { LogCodeLogCode } from '../../../common/model-validator/LogCodeLogCode'

const Actions = {

  /**
   * @param {LogCodeLogCode} model
   * @param {function} done
   * @return {Promise.<void>}
   */
  async create(model, done) {
    const res = await Resources.create(
      model.system_id,
      model.module_id,
      // interface_id从code中查询
      null,
      model.code,
      model.name
    )

    if (res.success) {
      model.set(res.body)
      model.set({ message: null })
      done()
      return
    }

    model.set('message', res.message)
    done()
  },

  /**
   * @param {String} id
   * @param {LogCodeLogCode} model
   * @param {function} done
   * @return {Promise.<void>}
   */
  async findById(id, model, done) {
    const res = await Resources.findById(id)

    if (res.success) {
      model.set(res.body)
      model.set({ message: null })
      done()
      return
    }

    model.set('message', res.message)
    done()
  },

  /**
   * @param {String} system_id
   * @param {String} code
   * @param {LogCodeLogCode} model
   * @param {function} done
   * @return {Promise.<void>}
   */
  async findByCode(system_id, code, model, done) {
    const res = await Resources.findByCode(system_id, code)

    if (res.success) {
      model.set(res.body)
      model.set({ message: null })
      done()
      return
    }

    model.set('message', res.message)
    done()
  },

  /**
   * @param {LogCodeLogCode} model
   * @param {function} done
   * @return {Promise.<void>}
   */
  async update(model, done) {
    if (!model.id) {
      model.set('message', '未初始化')
      done()
      return
    }

    const res = await Resources.update(model.id, model.code, model.name)
    if (res.success) {
      model.set(res.body)
      model.set({ message: null })
      done()
      return
    }

    model.set('message', res.message)
    done()
  },

  /**
   * @param {object} values 
   * @param {LogCodeModuleCode} model 
   * @param {function} done 
   */
  baseUpdate(values, model, done) {
    model.set(values)

    for (let propKey in values) {
      model[propKey] = values[propKey]
    }

    done()
  },

  /**
   * @param {LogCodeLogCode} model
   * @param {function} done
   * @return {Promise.<void>}
   */
  async destroy(model, done) {
    if (!model.id) {
      model.set('message', '未初始化')
      done()
      return
    }

    const res = await Resources.destroy(model.id)
    if (res.success) {
      model.reset()
      done()
      return
    }

    model.set('message', res.message)
    done()
  },

  /**
   * @param {LogCodeLogCode} model
   * @param {object} mod
   * @param {function} done
   */
  reset(model, mod, done) {
    model.reset()
    model.set(mod)
    done()
  }
}

/**
 * @param {{type:String, payload:*}} action
 * @param {LogCodeLogCode} model
 * @param {function} done
 * @return {*}
 */
function scheduler(action, model, done) {
  const { payload, type } = action

  switch (type) {
    case Action.CREATE:
      Actions.create(model, done)
      break

    case Action.FIND_BY_ID:
      Actions.findById(payload.id, model, done)
      break

    case Action.FIND_BY_CODE:
      Actions.findByCode(payload.system_id, payload.code, model, done)
      break

    case Action.UPDATE:
      Actions.update(model, done)
      break

    case Action.BASE_UPDATE:
      Actions.baseUpdate(payload, model, done)
      break

    case Action.DESTROY:
      Actions.destroy(model, done)
      break

    case Action.RESET:
      Actions.reset(model, payload, done)
      break

    default:
      done()
      return
  }
}

/**
 * @param {String} [name]
 * @return {StoreValidatorDesc<LogCodeLogCodeModel>}
 */
export default function (name) {
  return {
    namespace: name || namespace,
    scheduler,
    model: new LogCodeLogCode(),
    map
  }
}


export {
  Action
}
