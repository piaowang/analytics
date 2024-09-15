/**
 * Created by asd on 17-7-17.
 */

import TaskResource from '../../../models/access-data-task/resource'
import ProjectResource from '../../../models/project/resource'
import DimensionResource from '../../../models/dimension/resource'
import { ReadLineAsString } from 'next-reader'
import { getRecord, get } from '../base/ot-conf'
import { exportFile } from '../../../../common/sugo-utils'
import _ from 'lodash'

export default {

  /**
   * 查询项目列表
   * @param store
   * @param done
   * @return {Promise.<void>}
   */
  async projects(store, done){
    const res = await ProjectResource.list()
    done({ Projects: res.success ? res.result : [] })
  },

  /**
   * 查询项目下的所有task记录
   * @param {String} project_id
   * @param {Store} store
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async list(project_id, store, done){
    // TODO LOADING STATE
    const res = await TaskResource.queryWithStatus(project_id)
    done({ AccessDataTask: res.success ? res.result : [] })
  },

  /**
   * @param {AccessDataTaskViewModel} state
   * @param {File} file
   * @param {Store} store
   * @param {Function} done
   */
  parseFile(state, file, store, done){
    const reader = new ReadLineAsString(file)
    let lines = []

    reader.subscribe(
      record => {
        if (record.type === ReadLineAsString.Type.line) {
          lines.push(record)
        }
      },
      // TODO send message
      err => store.dispatch({ type: '___error', payload: { err } }),
      () => complete(lines)
    )

    reader.read()

    /**
     *
     * @param {Array} types
     */
    function complete (types) {
      let titles = []
      let arr, type, name

      types.forEach(r => {
        arr = r.data.trim().split(':')
        name = arr[0]
        type = arr[1] || 'string'

        if (name && type) {
          titles.push({
            name,
            type: type.toLowerCase(),
            no: r.no
          })
        }
      })

      titles = _.uniqWith(titles, (a, b) => a.name === b.name)
        .map(r => r.type === 'date' ? { ...r, format: 'millis' } : r)

      let rc = getRecord('dimensions')

      state.ot.set(rc.path, titles.slice())

      rc = getRecord('columns')
      state.ot.set(rc.path, titles.map(r => r.name))

      for (let n of ['timestampSpec_column', 'timestampSpec_format']) {
        rc = getRecord(n)
        state.ot.set(rc.path, '')
      }

      done({
        file,
        titles
      })
    }
  },

  /**
   * @param {String} id
   * @param {AccessDataTaskViewModel} state
   * @param {Store} store
   * @param {Function} done
   */
  async stopOne(id, state, store, done){
    const { AccessDataTask } = state
    const model = AccessDataTask.find(r => r.id === id)

    if (!model) {
      return done({})
    }

    const res = await TaskResource.stop(model)
    done(res.success
      ? {
        AccessDataTask: AccessDataTask.map(r => r.id === id ? { ...r, ...res.result } : r)
      }
      : {}
    )
  },

  /**
   * @param {String} id
   * @param {AccessDataTaskViewModel} state
   * @param {Store} store
   * @param {Function} done
   */
  async runOne(id, state, store, done){
    const { AccessDataTask } = state
    const model = AccessDataTask.find(r => r.id === id)

    if (!model) {
      return done({})
    }

    const res = await TaskResource.run(model)
    done(res.success
      ? {
        AccessDataTask: AccessDataTask.map(r => r.id === id ? { ...r, ...res.result } : r)
      }
      : {}
    )
  },

  setParams(state, store, done){
    const { AccessDataTask } = store.getState()
    const { ot } = state

    ot.object = AccessDataTask.params

    done({
      ot,
      access_type: get('type', ot),
      resource_file_type: get('format', ot),
      csv_separator: '',
      file_dir: get('paths', ot),
      titles: get('dimensions', ot).map((v, i) => ({ ...v, no: i })),
      file: new File([new ArrayBuffer(0)], '__.csv')
    })
  },

  /**
   * @param {AccessDataTaskViewModel} state
   * @param {Store} store
   * @param {Function} done
   */
  download(state, store, done){
    const content = [
      'id:string',
      'name:string',
      'age:date',
      'birthday:int',
      'city:string',
      'country:string'
    ]
    exportFile('types.csv', content.join('\n'))
    done({})
  },

  /**
   * 同步维度
   * @param {AccessDataTaskViewModel} state
   * @param {Store} store
   * @param {Function} done
   */
  async sync(state, store, done){
    const { Project } = store.getState()
    const res = await DimensionResource.sync(Project.datasource_id)
    // TODO send message
    debug('sync project [%s] dimension: => %s', Project.datasource_id, JSON.stringify(res.result))
    done({})
  }

}
