/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2017/12/23
 * @description
 */

import namespace from './namespace'
import Action from './action'
import Resources from './resources'
import map from './map'
import { LogCodeModuleCode } from '../../../common/model-validator/LogCodeModuleCode'

const Actions = {
  /**
   * @param {String} code
   * @param {String} system_id
   * @param {LogCodeModuleCode} model
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async create(code, system_id, model, done) {
    const res = await Resources.create(code, system_id)

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
   * @param {LogCodeModuleCode} model 
   * @param {function} done
   * @return {Promise.<void>} 
   */
  async baseCreate(model, done) {
    const { code, system_id } = model
    const res = await Resources.create(code, system_id)

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
   * @param {LogCodeModuleCode} model
   * @param {Function} done
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
   * @param {LogCodeModuleCode} model
   * @param {Function} done
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
   * @param {LogCodeModuleCode} model
   * @param {function} done
   * @return {Promise.<void>}
   */
  async update(model, done) {
    if (!model.id) {
      model.set('message', '未初始化')
      done()
      return
    }

    const res = await Resources.update(model.id, model.code)

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
   * @param {LogCodeModuleCode} model
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
   * @param {LogCodeModuleCode} model
  //  * @param {object} mod
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
 * @param {LogCodeModuleCode} model
 * @param {function} done
 * @return {*}
 */
function scheduler(action, model, done) {
  const { payload, type } = action

  switch (type) {
    case Action.CREATE:
      Actions.create(payload.code, payload.system_id, model, done)
      break

    case Action.BASE_CREATE:
      Actions.baseCreate(model, done)
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
 * @return {StoreValidatorDesc<LogCodeModuleCode>}
 */
export default function (name) {
  return {
    namespace: name || namespace,
    scheduler,
    model: new LogCodeModuleCode(),
    map
  }
}


export {
  Action
}
