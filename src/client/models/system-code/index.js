/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2017/12/23
 * @description
 */

import namespace from './namespace'
import Action from './action'
import Resources from './resources'
import map from './map'
import { LogCodeSystemCode } from '../../../common/model-validator/LogCodeSystemCode'

const Actions = {
  /**
   * @param {object} payload
   * @param {LogCodeSystemCode} model
   * @param {function} done
   * @return {Promise.<void>}
   */
  async create(payload, model, done) {
    const { code, name, project_id, description } = payload
    const res = await Resources.create(code, name, project_id, description)

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
   * @param {object} payload
   * @param {LogCodeSystemCode} model
   * @param {function} done
   * @return {Promise.<void>}
   */
  async baseCreate(model, done) {
    const { code, name, project_id, description } = model
    const res = await Resources.create(code, name, project_id, description)

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
   * @param {LogCodeSystemCode} model
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
   * @param {String} project_id
   * @param {String} code
   * @param {LogCodeSystemCode} model
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async findByCode(project_id, code, model, done) {
    const res = await Resources.findByCode(project_id, code)
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
   * @param {LogCodeSystemCode} model
   * @param {function} done
   * @return {Promise.<void>}
   */
  async update(model, done) {
    if (!model.id) {
      done({ message: '未初始化' })
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
   * @param {object} props 
   * @param {LogCodeSystemCode} model 
   * @param {function} done
   * @return {Promise.<void>} 
   */
  baseUpdate(props, model, done) {
    model.set(props)

    for (let propKey in props) {
      model[propKey] = props[propKey]
    }

    done()
  },

  /**
   * @param {LogCodeSystemCode} model
   * @param {function} done
   * @return {Promise.<void>}
   */
  async destroy(model, done) {
    if (!model.id) {
      done({ message: '未初始化' })
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
   * @param {LogCodeSystemCode} model
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
 * @param {LogCodeSystemCode} model
 * @param {function} done
 * @return {*}
 */
function scheduler(action, model, done) {
  const { payload, type } = action

  switch (type) {
    case Action.CREATE:
      Actions.create(payload, model, done)
      break

    case Action.BASE_CREATE:
      Actions.baseCreate(model, done)
      break

    case Action.FIND_BY_ID:
      Actions.findById(payload.id, model, done)
      break

    case Action.FIND_BY_CODE:
      Actions.findByCode(payload.project_id, payload.code, model, done)
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
 * @return {StoreValidatorDesc<LogCodeSystemCodeModel>}
 */
export default function (name) {
  return {
    namespace: name || namespace,
    scheduler,
    model: new LogCodeSystemCode(),
    map
  }
}

export {
  Action
}
