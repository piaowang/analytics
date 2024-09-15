import Fetch from 'client/common/fetch-final'
import _ from 'lodash'
import { message } from 'antd'
import { sendURLEncoded, sendJSON, recvJSON } from '../../../common/fetch-utils'
import { toQueryParams, tryJsonParse } from '../../../../common/sugo-utils'
import { getTypeKeysByKey, makeTreeNode } from '../constants'
import {makeGraphData } from './consanguinity-analysis/graph'
import {test_value} from './consanguinity-analysis/test-data'

export const namespace = 'taskCatalogTree'

export default props => ({
  namespace: `${namespace}`,
  state: {
    expandedKeys: [],
    selectedKeys: [],
    treeData: [],
    cataLogTreeInfo: {}, //数据库连接信息
    dataTables: [], //数据库表信息
    dataFields: [], //字段信息
    dataIndexs: [],
    tableInfo: {},
    editingOrder: false,
    listData: [],
    versions: [],
    selectVersion: '',
    lineageData: {} // 血缘分析数据
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
    *editTypeName({ payload }, { call, select, put }) {
      let url = '/app/new-task-schedule/catalogType'
      const { id, name, parentId } = payload
      const params = id ? toQueryParams({
        id,
        action: 'edit',
        name,
        parentId,
        level: 0,
        description: ''
      })
        : toQueryParams({
          action: 'add',
          name,
          parentId,
          level: 0,
          description: ''
        })
      const res = yield call(Fetch.post, url + '?' + params, null)
      // const res = yield call(Fetch.post, url, null, { ...sendURLEncoded, body: params})
      if (res && res.status && res.status === 'success') {
        yield put({ type: 'getCatalogTreeData', payload: {} })
        yield put({ type: 'changeState', payload: { loading: false, showEditType: false } })
      } else {
        message.error((id ? '修改失败！' : '添加失败！') + res.msg)
        yield put({ type: 'changeState', payload: { loading: false } })
      }
    },
    *deleteType({ payload }, { call, select, put }) {
      let url = '/app/new-task-schedule/catalogType'
      const { id } = payload
      let { cataLogTreeInfo } = yield select(state => state[namespace])
      const keys = getTypeKeysByKey([id], cataLogTreeInfo.types)
      if (cataLogTreeInfo.tasks && _.some(cataLogTreeInfo.tasks, p => keys.includes(p.typeId.toString()))) {
        message.error('请先删除分类下的任务或分类!')
        return
      }
      const params = toQueryParams({ id, action: 'delete' })
      const res = yield call(Fetch.post, url + '?' + params, null)
      // const res = yield call(Fetch.post, url, null, { ...sendURLEncoded, body: params})
      if (res && res.status && res.status === 'success') {
        message.success('删除成功')
        yield put({ type: 'getCatalogTreeData', payload: {} })
        yield put({ type: 'changeState', payload: { loading: false, selectTypeKey: '' } })
      } else {
        message.error('删除失败')
        yield put({ type: 'changeState', payload: { loading: false, selectTypeKey: '' } })
      }
    },
    *saveOrder({ payload }, { call, select, put }) {
      let { sortInfo } = payload
      yield call(Fetch.post, '/app/new-task-schedule/catalogType?action=updateTree', null, {
        ...recvJSON,
        body: JSON.stringify({ content: sortInfo })
      })
      yield put({
        type: 'changeState',
        payload: { editingOrder: false }
      })
      message.success('保存排序成功')
    },
    *getCatalogTreeData({ payload }, { call, select, put }) {
      let { dataDbs = [] } = yield select(state => state[namespace])
      if (dataDbs.length) {
        return
      }
      let url = '/app/new-task-schedule/catalogType?action=lastestHiveSchema'
      let res = yield call(Fetch.get, url, null)
      if (res && res.status && res.status === 'success') {
        const key = 'type-' + (_.first(res.data) || {}).TABLE_SCHEM
        yield put({
          type: 'changeState',
          payload: {
            selectedKeys: [key],
            listData: res.data || []
          }
        })
      } else {
        message.error('获取数据库连接信息失败!')
        yield put({ type: 'changeState', payload: { loading: false } })
      }
      // let url = '/app/new-task-schedule/catalogType'
      // let res = yield call(Fetch.get, url, null)
      // if (res && res.status && res.status === 'success') {
      //   const types = _.concat(res.catalogTypes, res.dataBaseInfos.map(p => ({ ...p, name: p.dbAlais, parentId: p.typeId, id: 'db-' + p.id })))
      //   const cataLogTreeInfo = { types: types, tasks: res.tableInfos.map(p => ({ ...p, showName: p.tableName, typeId: p.actionType === 1 ? 'db-' + p.dbId : p.typeId })), order: res.catalogTypeSort }
      //   const treeData = makeTreeNode(cataLogTreeInfo)
      //   const newSelectKey = selectedKeys.length ? selectedKeys[0] : 'type-' + types.find(p => p.actionType === 1).id
      //   let listData = []
      //   if (_.startsWith(newSelectKey, 'type-')) {
      //     const key = newSelectKey.substr(5)
      //     let keys = getTypeKeysByKey([key], cataLogTreeInfo.types)
      //     const keyByTypes = _.keyBy(cataLogTreeInfo.types, 'id')
      //     // console.log('keyByTypes---', keyByTypes)
      //     listData = cataLogTreeInfo.tasks.filter(p => keys.includes(p.typeId.toString()))
      //     listData = listData.map(o => ({
      //       ...o, dbName: _.get(keyByTypes, `${o.typeId}.dbName`)
      //     }))
      //   }

      //   yield put({
      //     type: 'changeState',
      //     payload: {
      //       cataLogTreeInfo,
      //       treeData,
      //       selectedKeys: [newSelectKey],
      //       listData
      //     }
      //   })
      // } else {
      //   message.error('获取数据库连接信息失败!')
      //   yield put({ type: 'changeState', payload: { loading: false } })
      // }
    },
    /**
     * 获取字段信息
     * @param {*} param0 
     * @param {*} param1 
     */
    *getDataFields({ payload }, { call, select, put }) {
      const { selectedKeys, expandedKeys } = payload
      if (!selectedKeys.length) {
        return
      }
      const [dbName, tableName ] = selectedKeys[0].split('##')
      let url = `/app/task-schedule-v3/dataBase?action=lastestColumnAndIndexInfo&dbName=${dbName}&tableName=${tableName}`
      let res = yield call(Fetch.get, url, null)
      if (res && res.status && res.status === 'success') {
        yield put({
          type: 'changeState',
          payload: _.pickBy({
            tableInfo: {tableName: tableName},
            dataFields: _.get(res, 'data.columnInfos', []),
            dataIndexs:  _.get(res, 'data.indexInfos', []),
            versions: [''],
            selectVersion: _.get(res.versions, '0.id', ''),
            selectedKeys,
            expandedKeys
          }, _.identity)
        })
      } else {
        message.error('获取数据库表信息失败!')
        yield put({ type: 'changeState', payload: { loading: false } })
      }
      // let { cataLogTreeInfo } = yield select(state => state[namespace])
      // const tableInfo = cataLogTreeInfo.tasks.find(p => p.id.toString() === selectedKeys[0]) || {}
      // let url = `/app/new-task-schedule/dataBase?dataType=columnAndIndexInfo&dbId=${tableInfo.dbId}&tableName=${tableInfo.tableName}&update=false`
      // let res = yield call(Fetch.get, url, null)
      // if (res && res.status && res.status === 'success') {
      //   yield put({
      //     type: 'changeState',
      //     payload: _.pickBy({
      //       tableInfo: tableInfo,
      //       dataFields: res.columnInfos,
      //       dataIndexs: res.indexInfos,
      //       versions: res.versions,
      //       selectVersion: _.get(res.versions, '0.id', ''),
      //       selectedKeys,
      //       expandedKeys
      //     }, _.identity)
      //   })
      // } else {
      //   message.error('获取数据库表信息失败!')
      //   yield put({ type: 'changeState', payload: { loading: false } })
      // }
    },
    *getDataFieldsByVersion({ payload }, { call, select, put }) {
      const { selectVersion } = payload
      if (!selectVersion) {
        return
      }
      let url = `/app/new-task-schedule/dataBase?dataType=columnAndIndexWithVersion&id=${selectVersion}`
      let res = yield call(Fetch.get, url, null)
      if (res && res.status && res.status === 'success') {
        yield put({
          type: 'changeState',
          payload: {
            dataFields: res.columnInfos,
            dataIndexs: res.indexInfos,
            selectVersion
          }
        })
      } else {
        message.error('获取数据库表信息失败!')
        yield put({ type: 'changeState', payload: { loading: false } })
      }
    },
    *deleteBaseTable({ payload }, { call, select, put }) {
      const { dbId, tableName } = payload
      if (!dbId || !tableName) {
        return
      }
      let url = `/app/new-task-schedule/dataBase?action=deleteTableInfo&dbId=${dbId}&tableName=${tableName}`
      let res = yield call(Fetch.post, url, null)
      if (res && res.status && res.status === 'success') {
        yield put({ type: 'getCatalogTreeData', payload: {} })
      } else {
        message.error('获取数据库表信息失败!')
        yield put({ type: 'changeState', payload: { loading: false } })
      }
    },
    *getLineageData({payload = {}}, {call, put }) {
      const {name } = payload
      const url = `/app/task-schedule-v3/dataBase?action=fetchLineageRecurse&name=${name}`
      let {status, data} = yield call(Fetch.get, url, null)
      if(status === 'success') {
        data = _.isString(data) ? JSON.stringify(data) : data
        if(_.isEmpty(data) || !_.get(data, 'sources.length')) {
          return message.warn('基于工作流元数据无法获取血缘关系')
        }
        const graphData = makeGraphData(data)
        // const graphData = test_value
        return yield put({
          type: 'changeState',
          payload: {lineageData: graphData} 
        })
      }
      return message.error('获取血缘数据失败')
    }
  },
  subscriptions: {
    init({ dispatch }) {
      dispatch({ type: 'getCatalogTreeData', payload: {} })
      return () => { }
    }
  }
})
