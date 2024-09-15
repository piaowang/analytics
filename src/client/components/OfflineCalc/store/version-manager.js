
import Fetch from 'client/common/fetch-final'
import {TagTypeEnum, OfflineCalcTargetType} from '../../../../common/constants'
import {dictBy} from '../../../../common/sugo-utils'
import _ from 'lodash'

export default {
  namespace: 'offlineCalcVersionManager',
  state: {
    tree: [
      { key: OfflineCalcTargetType.Indices, title: '指标'},
      { key: OfflineCalcTargetType.IndicesModel, title: '指标维度'}
    ],
    list: [],
    offlineCalcDataSources: [],
    treeDataList: [],
    expandedKeys: [ OfflineCalcTargetType.Indices,OfflineCalcTargetType.IndicesModel],
    autoExpandParent: false,
    tags: [],
    diffModalVisible: false,
    clone: {},
    selectedType: '',
    searchValue: '',
    dimIdNameDict: []
  },
  reducers: {
    change(state, { payload }) {
      return {
        ...state,
        ...payload
      }
    }
  },
  sagas: {
    *init({ payload }, {call, put}) {
      yield put({
        type: 'change',
        payload: {
          tree: [
            { key: OfflineCalcTargetType.Indices, title: '指标'},
            { key: OfflineCalcTargetType.IndicesModel, title: '指标维度'}
          ],
          list: [],
          offlineCalcDataSources: [],
          treeDataList: [],
          expandedKeys: [
            OfflineCalcTargetType.Indices,
            OfflineCalcTargetType.IndicesModel
          ],
          autoExpandParent: false,
          tags: [],
          diffModalVisible: false,
          clone: {},
          selectedType: '',
          searchValue: '',
          dimIdNameDict: []
        }
      })

      let { result } = yield call(Fetch.get, '/app/offline-calc/get-version-tree')

      let tree = [
        {
          title: '指标',
          key: OfflineCalcTargetType.Indices,
          children: result.IndicesList.map( i => {
            return {
              title: i.name,
              key: i.id + OfflineCalcTargetType.Indices
            }
          })
        },
        {
          title: '指标模型',
          key: OfflineCalcTargetType.IndicesModel,
          children: result.IndicesModelList.map( i => {
            return {
              title: i.name,
              key: i.id + OfflineCalcTargetType.IndicesModel
            }
          })
        }
      ]

      let treeDataList = []
      const generateList = data => {
        for (let i = 0; i < data.length; i++) {
          const node = data[i]
          const key = node.key
          treeDataList.push({ key, title: node.title })
          if (node.children) {
            generateList(node.children)
          }
        }
      }

      generateList(tree)

      yield put({
        type: 'change',
        payload: {
          tree,
          treeDataList
        }
      })



      let { result: dsRes } = yield call(Fetch.get, '/app/offline-calc/data-sources')
      if (!_.isEmpty(dsRes)) {
        yield put({
          type: 'change',
          payload: {
            offlineCalcDataSources: dsRes
          }
        })
      }


      let tagRes = yield call(Fetch.get, '/app/tag/get/all', {type: TagTypeEnum.offline_calc_dimension})

      yield put({
        type: 'change',
        payload: {
          tags: _.get(tagRes, 'data', [])
        }
      })

    },
    *fetchVersionList({ payload }, { call, put }) {
      let { result } = yield call(Fetch.get, '/app/offline-calc/get-version-list', payload)
      yield put({
        type: 'change',
        payload: {
          list: result
        }
      })
    }
  },
  subscriptions: {
    init({ dispatch, history }) {
      const { pathname } = history.getCurrentLocation()

      if (pathname.includes('/console/offline-calc/version-manager')) {
        dispatch({ type: 'init' })
      }
    }
  }
}
