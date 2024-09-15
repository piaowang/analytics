import Fetch from '../../common/fetch-final'
import { message } from 'antd'
import _ from 'lodash'
import { AccessDataType } from '../../../common/constants'

export const namespace = 'marketing-edit-model'
export const dimsType = {
  tag: 1,
  behavior: 3,
  trade: 2
}

export const pageSize = 12
export default (props) => ({
  namespace,
  state: {
    content: { type: 2 },
    tagDimensions: [],
    transactionDimensions: [],
    actionDimensions: [],
    loading: false,
    usergroup: {}
  },
  reducers: {
    changeState(state, { payload }) {
      return {
        ...state,
        ...payload
      }
    }
  },
  sagas: {
    *getInfo(action, effects) {
      yield effects.put({ type: 'changeState', payload: { loading: true } })
      let { projectCurrent, projectList, type } = props
      const tagProjects = projectCurrent.access_type === AccessDataType.Tag ? [projectCurrent] : projectList.filter(p => p.datasource_name === projectCurrent.tag_datasource_name)
      const res = yield effects.call(Fetch.get,
        `/app/marketing-model-settings/get/${_.get(tagProjects, '0.id')}`, { type })
      if (res.success) {
        yield effects.put({
          type: 'changeState',
          payload: {
            content: _.isEmpty(res.result) ? { type } : res.result
          }
        })
        const {tag_datasource_id, trade_datasource_id, behavior_datasource_id} = _.get(res, 'result.datasets', {})
        if(tag_datasource_id) {
          const project = projectList.find(p=> p.id === tag_datasource_id) || {}
          yield effects.put({ type: 'getDimensions', payload: { type: dimsType.tag, datasourceId: _.get(project, 'datasource_id', '') } })
        }
        if(trade_datasource_id) {
          const project = projectList.find(p=> p.id === trade_datasource_id) || {}
          yield effects.put({ type: 'getDimensions', payload: { type: dimsType.trade, datasourceId: _.get(project, 'datasource_id', '') } })
        }
        if(behavior_datasource_id) {
          const project = projectList.find(p=> p.id === behavior_datasource_id) || {}
          yield effects.put({ type: 'getDimensions', payload: { type: dimsType.behavior, datasourceId: _.get(project, 'datasource_id', '') } })
        }

      } else {
        message.error('获取信息失败')
        yield effects.put({ type: 'changeState', payload: { loading: false } })
      }
    },

    *save(action, effects) {
      const { info } = action.payload
      let { projectCurrent, projectList, type } = props
      const tagProjects = projectCurrent.access_type === AccessDataType.Tag ? [projectCurrent] : projectList.filter(p => p.datasource_name === projectCurrent.tag_datasource_name)
      const url = info.id ? `/app/marketing-model-settings/update/${info.id}` : '/app/marketing-model-settings/create'
      const res = yield effects.call(info.id ? Fetch.put : Fetch.post, url, _.omit(info, ['id']))
      if (res.success) {
        yield effects.put({ type: 'getInfo', payload: {} })
        action.callback && action.callback()
        yield effects.put({
          type: 'usergroupsModalSetting/getCalcState',
          payload: {projectId: _.get(tagProjects, '0.id')}
        })
        message.success('保存成功')
      } else {
        message.error('保存失败')
      }
    },

    *getDimensions(action, effects) {
      const { type, datasourceId } = action.payload
      const res = yield effects.call(Fetch.get, `/app/dimension/get/${datasourceId}?includeNotUsing=true&datasource_type=all`)
      if (res && res.data) {
        if (type === dimsType.tag) {
          yield effects.put({ type: 'changeState', payload: { tagDimensions: res.data } })
          return
        }
        if (type === dimsType.trade) {
          yield effects.put({ type: 'changeState', payload: { transactionDimensions: res.data } })
          return
        }
        yield effects.put({ type: 'changeState', payload: { actionDimensions: res.data } })
      } else {
        message.error('获取维度数据失败')
      }
    }
  },
  subscriptions: {
    init({ dispatch }) {
      dispatch({ type: 'getInfo', payload: {} })
    }
  }
})
