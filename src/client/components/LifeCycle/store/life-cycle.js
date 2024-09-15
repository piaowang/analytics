/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-04-10 18:14:16
 * @description 生命周期model
 */
import * as lifeCycleService from '../../../services/life-cycle'
import * as modelsService from 'client/services/marketing/models'
import * as scenesService from 'client/services/marketing/scenes'
import { UNTILTYPE } from './constants'
import { fetch, getResultByDate } from 'client/services/marketing/events'

export const namespace = 'lifeCycle'

const defaultState = {
  lifeCycle: {

  },
  selectedModule: '',
  lcMainActiveKey: 'baseData',

  dataBase: {
    since: moment(),
    until: moment().add(-7, 'd'),
    untilType: 'preWeek',
    nowUg: [],
    preUg: []
  },

  rotated: {
    nowUg: [],
    preUg: [],
    hasData: false,
    addRotatedVisible: false,
    rotatedTarget: [],
    rotatedUsergroup: []
  },

  tagSpread: {
    since: moment(),
    nowUg: [],
    selectedTag: []
  },

  marketingModule: {
    lcModel: null,
    scenes: [],
    submitLoading: false,
    marketingResult: {}
  }
}

export default {
  namespace,
  state: {
    ...defaultState
  },
  reducers: {
    setState(state, { payload }) {
      return {
        ...state,
        ...payload
      }
    }
  },
  sagas: {
    *init({ payload }, { call, put, select, take }) {
      let { project_id = '' } = payload
      if (!project_id) {
        const projectCurrent = yield select(state => state.sagaCommon.projectCurrent)
        project_id = projectCurrent.id
      }

      yield put({
        type: 'setState',
        payload: {
          ...defaultState
        }
      })

      //一个项目只有一个生命周期模型 如果改多个则改为全部请求下来 做个列表选择
      const { result: lifeCycle = {} } = yield call(lifeCycleService.findOne, project_id)

      yield put({
        type: 'setState',
        payload: {
          lifeCycle
        }
      })

      if (!_.isEmpty(lifeCycle)) {
        yield put({ type: 'initUg' })
      }
    },
    *initUg({ }, { call, put, select }) {
      //默认拉上周同期的历史数据 没有就前一天 没有就没有了

      const lifeCycle = yield select(state => state.lifeCycle.lifeCycle)
      const { result } = yield call(lifeCycleService.findAllUg, { ugIds: (lifeCycle.stages || []).map( i => i.id ), queryAll: true } )

      if (!_.isEmpty(result)) {
        const { nowUg, preUg, preWeekOrDay } = result

        let hasPreUg = !_.isEmpty(preUg)

        let nowUgTotal = 0
        let preUgTotal = 0
        nowUg.map( i => nowUgTotal += i.params.total)
        preUg.map( i => preUgTotal += _.get(i,'params.total',0))

        const dataBase = yield select(state => state.lifeCycle.dataBase)
        const rotated = yield select(state => state.lifeCycle.rotated)

        let until = preWeekOrDay === UNTILTYPE.preDay ? moment().add(-1, 'd') : moment().add(-7, 'd'),
          untilType = preWeekOrDay === UNTILTYPE.preDay ? 'preDay' : 'preWeek'

        let nextDataBase = {
          until,
          untilType,
          nowUg: nowUg.map( i => ({
            title: i.title,
            id: i.segment_id || i.id,
            userCount: i.params.total || 0,
            userRatio: (i.params.total * 100 / nowUgTotal).toFixed(2)
          })),
          preUg: (hasPreUg ? preUg : lifeCycle.stages).map( i => ({
            title: i.title,
            id: i.segment_id,
            userCount: _.get(i, 'params.total') || 0,
            userRatio: (_.get(i,'params.total',0) * 100 / Math.max(preUgTotal, 1)).toFixed(2)
          }))
        }

        let nextRotated = {
          until, untilType, hasData: preUgTotal !== 0, nowUg, preUg
        }

        yield put({
          type: 'setState',
          payload: {
            dataBase: {
              ...dataBase,
              ...nextDataBase
            },
            rotated: {
              ...rotated,
              ...nextRotated
            }
          }
        })
      }
    },
    *fetchNowUg({ payload }, { call, put, select }) {
      const lifeCycle = yield select(state => state.lifeCycle.lifeCycle)
      const since = yield select(state => state.lifeCycle.dataBase.since)

      let nowUgTotal = 0
      let nextDataBase = {}

      const dataBase = yield select(state => state.lifeCycle.dataBase)
      const rotated = yield select(state => state.lifeCycle.rotated)

      if (since.diff(moment(),'d') === 0) {
        const { result = [] } = yield call(lifeCycleService.findAllUg, { ugIds: (lifeCycle.stages || []).map( i => i.id ), queryAll: false })

        nowUgTotal = 0
        result.map( i => nowUgTotal += i.params.total)

        nextDataBase = {
          nowUg: result.map( i => ({
            title: i.title,
            id: i.segment_id || i.id,
            userCount: _.get(i, 'params.total') || 0,
            userRatio: (_.get(i,'params.total',0) * 100 / Math.max(nowUgTotal, 1)).toFixed(2)
          }))
        }

        return yield put({
          type: 'setState',
          payload: {
            dataBase: {
              ...dataBase,
              ...nextDataBase
            },
            rotated: {
              ...rotated,
              nowUg: result
            }
          }
        })
      }

      const { result = [] } = yield call(lifeCycleService.findPreUg, { until: since, ugIds: (lifeCycle.stages || []).map( i => i.id )} )

      if (!_.isEmpty(result)) {
        result.map( i => nowUgTotal += _.get(i,'params.total',0))
        nextDataBase = {
          nowUg: result.map( i => ({
            title: i.title,
            id: i.segment_id,
            userCount: _.get(i, 'params.total') || 0,
            userRatio: (_.get(i,'params.total',0) * 100 / Math.max(nowUgTotal, 1)).toFixed(2)
          }))
        }
      } else {
        nextDataBase = {
          nowUg: (lifeCycle.stages || []).map(i => ({
            title: i.title,
            id: i.segment_id,
            userCount: _.get(i, 'params.total') || 0,
            userRatio: (_.get(i,'params.total',0) * 100 / Math.max(nowUgTotal, 1)).toFixed(2)
          }))
        }
      }
      
      yield put({
        type: 'setState',
        payload: {
          dataBase: {
            ...dataBase,
            ...nextDataBase
          },
          rotated: {
            ...rotated,
            nowUg: result
          }
        }
      })
    },
    *fetchPreUg({ payload }, { call, put, select }) {
      const lifeCycle = yield select(state => state.lifeCycle.lifeCycle)
      const until = yield select(state => state.lifeCycle.dataBase.until)
      const { result = [] } = yield call(lifeCycleService.findPreUg, { until, ugIds: (lifeCycle.stages || []).map( i => i.id )} )


      let preUgTotal = 0
      let nextDataBase = {}

      if (!_.isEmpty(result)) {
        result.map( i => preUgTotal += _.get(i,'params.total',0))
        nextDataBase = {
          preUg: result.map( i => ({
            title: i.title,
            id: i.id,
            segment_id: i.segment_id,
            userCount: _.get(i, 'params.total') || 0,
            userRatio: (_.get(i,'params.total',0) * 100 / Math.max(preUgTotal, 1)).toFixed(2)
          }))
        }
      } else {
        nextDataBase = {
          preUg: (lifeCycle.stages || []).map( i => ({
            title: i.title,
            id: i.segment_id,
            segment_id: i.segment_id,
            userCount: 0,
            userRatio: 0
          }))
        }
      }
      
      const dataBase = yield select(state => state.lifeCycle.dataBase)
      const rotated = yield select(state => state.lifeCycle.rotated)

      yield put({
        type: 'setState',
        payload: {
          dataBase: {
            ...dataBase,
            ...nextDataBase
          },
          rotated: {
            ...rotated,
            preUg: result,
            hasData: !_.isEmpty(result)
          }
        }
      })

    },
    *fetchTagUg({}, { call, put, select }) {
      const lifeCycle = yield select(state => state.lifeCycle.lifeCycle)
      const since = yield select(state => state.lifeCycle.tagSpread.since)

      let nowUgTotal = 0

      const tagSpread = yield select(state => state.lifeCycle.tagSpread)

      if (since.diff(moment(),'d') === 0) {
        const { result = [] } = yield call(lifeCycleService.findAllUg, { ugIds: (lifeCycle.stages || []).map( i => i.id ), queryAll: false })

        nowUgTotal = 0
        result.map( i => nowUgTotal += i.params.total)

        return yield put({
          type: 'setState',
          payload: {
            tagSpread: {
              ...tagSpread,
              nowUg: result
            }
          }
        })
      }

      const { result = [] } = yield call(lifeCycleService.findPreUg, { until: since, ugIds: (lifeCycle.stages || []).map( i => i.id )} )

      yield put({
        type: 'setState',
        payload: {
          tagSpread: {
            ...tagSpread,
            nowUg: result.map( i => {
              i.id = i.segment_id
              return _.omit(i, 'segment_id')
            })
          }
        }
      })
    },
    *fetchMarketing({}, { call, put, select }) {
      const lifeCycle = _.cloneDeep(yield select(state => state.lifeCycle.lifeCycle))
      const { result = {} } = yield call(lifeCycleService.findMarketing, { id: lifeCycle.id })

      let sceneResult
      if (!_.isEmpty(result)) {
        sceneResult = yield call(scenesService.fetch, { model_id: result.model_id })
      }

      yield put({
        type: 'setState',
        payload: {
          marketingModule: {
            lcModel: result,
            scenes: _.get(sceneResult,'result', [])
          }
        }
      })
    },
    *createMarketingModel({ payload }, { call, put, select }) {
      const { values, handleVisible } = payload

      let marketingModule = yield select(state => state.lifeCycle.marketingModule)
      const lifeCycle = _.cloneDeep(yield select(state => state.lifeCycle.lifeCycle))

      yield put({
        type: 'setState',
        payload: {
          marketingModule: {
            ...marketingModule,
            submitLoading: true
          }
        }
      })

      let { result: model_id } = yield call(lifeCycleService.createModel, { name: values.model_name, lc_id: lifeCycle.id })

      if (!_.isEmpty(model_id)) {
        let sceneIdSet = {}

        for (let k in values.scenes) {
          let { result: sceneResult = {} } = yield call(scenesService.create, { model_id, name: values.scenes[k], status: 1 })
          sceneIdSet[k] = sceneResult[0].id
        }

        lifeCycle.stages = (lifeCycle.stages || []).map( i => {
          i.scene_id = sceneIdSet[i.id]
          return i
        }) 

        yield call(lifeCycleService.contractSegmentWithScene, { set: lifeCycle.stages })

        yield call(lifeCycleService.update, { lifeCycle, lifeCycleId: lifeCycle.id })

        handleVisible(false)

        yield put({
          type: 'init',
          payload: {}
        })
        yield put({
          type: 'fetchMarketing'
        })
      }
      yield put({
        type: 'setState',
        payload: {
          marketingModule: {
            ...marketingModule,
            submitLoading: false
          }
        }
      })
    },
    *updateMarketingModel({ payload }, { call, put, select }) {
      const { values, handleVisible } = payload

      let marketingModule = yield select(state => state.lifeCycle.marketingModule)
      const lifeCycle = _.cloneDeep(yield select(state => state.lifeCycle.lifeCycle))
      
      yield call(lifeCycleService.contractSegmentWithScene, { set: lifeCycle.stages })

      yield put({
        type: 'setState',
        payload: {
          marketingModule: {
            ...marketingModule,
            submitLoading: true
          }
        }
      })


      lifeCycle.stages = (lifeCycle.stages || []).map( i => {
        i.scene_id = values.scenes[i.id]
        return i
      }) 

      yield call(lifeCycleService.update, { lifeCycle, lifeCycleId: lifeCycle.id })

      handleVisible(false)

      yield put({
        type: 'init',
        payload: {}
      })
      yield put({
        type: 'setState',
        payload: {
          marketingModule: {
            ...marketingModule,
            submitLoading: false
          }
        }
      })
    },
    *fetchMarketingResult({ payload }, { call, put, select }) {
      const { id, time } = payload
      let marketingModule = yield select(state => state.lifeCycle.marketingModule)
      let marketingResult = marketingModule.marketingResult || {}
      let newMarketingRes = _.cloneDeep(marketingResult)
      const { result, success } = yield call(getResultByDate , id,  time)
      if (success) {
        newMarketingRes[id] = result
        yield put({
          type: 'setState',
          payload: {
            marketingModule: {
              ...marketingModule,
              marketingResult: newMarketingRes 
            }
          }
        })
      }
    }
  },
  subscriptions: {
    init({ dispatch, history }) {
      const { pathname } = history.getCurrentLocation()
      // 可以做异步加载数据处理
      if (pathname === '/console/life-cycle' ) {
        dispatch({ type: 'init', payload: {} })
      }
    }
  }
}
