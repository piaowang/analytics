import Fetch from 'client/common/fetch-final'
import _ from 'lodash'
import { message } from 'antd'
import { DatabaseOutlined, TableOutlined } from '@ant-design/icons'
import { immutateUpdate } from '../../../../../common/sugo-utils'
import SugoIcon from '~/components/common/sugo-icon'

const FIELD_ICON = {
  string: <SugoIcon type='sugo-data_type_string' />,
  number: <SugoIcon type='sugo-data_type_number' />,
  date: <SugoIcon type='sugo-data_type_date' />
}

export const namespace = 'taskV3HiveModel'

export default () => ({
  namespace: `${namespace}`,
  state: {
    treeData: [], // 树形结构数据
    fieldMap: {}, // 字段信息缓存
    loading: true // 加载状态
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
    /**
     * 获取hive 所有表结构
     * @param {*} param0
     * @param {*} param1
     */
    *getHiveCatalog({ payload }, { call, put }) {
      let url = `/app/new-task-schedule/catalogType?action=lastestHiveSchema&dbInfoId=${payload.dbInfoId}`
      const { status, data } = yield call(Fetch.get, url, null)
      if (status !== 'success') {
        message.error('获取hive结构失败')
        yield put({ type: 'changeState', payload: { loading: false } })
        return
      }
      // 根据返回的表信息 生成 属性结构 第一级 schem 第二级 table 第三级 field
      let treeData = _.groupBy(data, p => p.TABLE_SCHEM)
      treeData = _.reduce(
        treeData,
        (r, v, k) => {
          r.push({
            title: k,
            key: k,
            checkable: false,
            isLeaf: false,
            icon: <DatabaseOutlined />,
            children: v.map(p => {
              return {
                parentId: k,
                isLeaf: false,
                title: p.TABLE_NAME,
                key: `${k}##${p.TABLE_NAME}`,
                checkable: false,
                icon: <TableOutlined />
              }
            })
          })
          return r
        },
        []
      )
      yield put({ type: 'changeState', payload: { treeData, loading: false } })
    },
    /**
     * 获取hive表字段
     * @param {*} param0
     * @param {*} param1
     */
    *getHiveTableFields({ payload }, { call, select, put }) {
      const { dbName, tableName } = payload
      const { fieldMap, treeData } = yield select(state => state[namespace])
      const cache = _.get(fieldMap, `${dbName}_${tableName}`)
      if (cache) {
        return
      }
      yield put({ type: 'changeState', payload: { loading: true } })
      let url = `/app/task-schedule-v3/dataBase?action=lastestColumnAndIndexInfo&dbName=${dbName}&tableName=${tableName}`
      const { status, data } = yield call(Fetch.get, url, null)
      if (status !== 'success') {
        message.error('获取hive结构失败')
        yield put({ type: 'changeState', payload: { loading: false } })
        return
      }
      // 获取当前查询的表在treedata中的位置并将字段信息添加到表节点上
      const schemIndex = _.findIndex(treeData, p => p.key === dbName)
      const tableIndex = _.findIndex(treeData[schemIndex].children, p => p.key === `${dbName}##${tableName}`)
      const newData = immutateUpdate(treeData, `${schemIndex}.children.${tableIndex}`, val => {
        return {
          ...val,
          children: data.columnInfos.map(p => {
            if (p.type)
              return {
                title: p.name,
                key: `${dbName}##${tableName}##${p.name}`,
                checkable: true,
                isLeaf: true,
                icon: _.get(FIELD_ICON, p.type, <SugoIcon type='sugo-data_type_string' />)
              }
          })
        }
      })

      yield put({
        type: 'changeState',
        payload: {
          fieldMap: {
            ...fieldMap,
            [`${dbName}_${tableName}`]: data?.columnInfos || []
          },
          treeData: newData,
          loading: false
        }
      })
    }
  }
})
