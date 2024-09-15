import Fetch from '../common/fetch-final'
import {remoteUrl} from '../constants/interface'
import _ from 'lodash'
import {setLoading} from './common'
import moment from 'moment'
import {Tag} from 'antd'

const keyNameMap = {
  first_name: '用户名称',
  username: '用户名',
  cellphone: '电话',
  email: '邮箱',
  status: '用户状态',
  efficacy_at: '起效时间',
  loss_efficacy_at: '失效时间',
  roles: '所属角色',
  institutions_id: '所属机构',
  departments: '所属部门',
  updated_at: '更新时间',
  changed_by_fk: '更新人'
}

const bulidDataSource = (userNameMap, roleNameMap, institutionsNameMap, ...info) => {
  let result = {}
  info.forEach(i => {
    let arr = []
    for (let key in keyNameMap) {
      let obj = {}
      obj.title = keyNameMap[key]
      obj.difference = null
      obj.value = i[key] || null
      if (key === 'status') {
        obj.value = i[key]
          ? (i[key] === 0
            ? '停用'
            : '启用')
          : null
      }
      if (['efficacy_at', 'loss_efficacy_at', 'updated_at'].includes(key)) {
        obj.value = i[key]
          ? (moment(i[key]).format('YYYY-MM-DD HH:mm'))
          : null
      }
      if (key === 'roles') {
        obj.value = _.isArray(i[key])
          ? (i[key].map(i => {
            return roleNameMap[i.id]
          }).sort().join(', '))
          : null
      }
      if (key === 'institutions_id') {
        obj.value = i[key]
          ? institutionsNameMap[i[key]]
          : null
      }
      if (key === 'changed_by_fk') {
        obj.value = i[key]
          ? userNameMap[i[key]]
          : null
      }
      if (key === 'departments') {
        obj.value = (i[key] && i[key].length)
          ? i[key].map((v) => {
            return v.name
          }).join(',')
          : ''
      }
      arr.push(obj)
    }
    result[i.groupType] = arr
  })

  for (let key in keyNameMap) {
    let value = result[info[0].groupType]
      .find(i => i.title === keyNameMap[key])
      .value
    let otherValue = result[info[1].groupType]
      .find(i => i.title === keyNameMap[key])
      .value

    if (_.isEqual(value, otherValue)) {
      result[info[0].groupType] = result[info[0].groupType].map(i => {
        if (i.title === keyNameMap[key]) {
          return {
            ...i,
            difference: null
          }
        }
        return i
      })
      result[info[1].groupType] = result[info[1].groupType].map(i => {
        if (i.title === keyNameMap[key]) {
          return {
            ...i,
            difference: null
          }
        }
        return i
      })
    } else {
      result[info[0].groupType] = result[info[0].groupType].map(i => {
        if (i.title === keyNameMap[key]) {
          return {
            ...i,
            difference: '有差异'
          }
        }
        return i
      })
      result[info[1].groupType] = result[info[1].groupType].map(i => {
        if (i.title === keyNameMap[key]) {
          return {
            ...i,
            difference: '有差异'
          }
        }
        return i
      })
    }
  }
  return result
}

const buildColumnsAndData = (info, res, userNameMap, roleNameMap, institutionsNameMap) => {
  let columns = [
    {
      title: '字段名',
      dataIndex: 'title',
      key: 'title',
      width: 200
    }, {
      title: '属性值',
      dataIndex: 'value',
      key: 'value',
      width: 200
    }, {
      title: '差异',
      dataIndex: 'difference',
      key: 'difference',
      width: 200,
      render: (val) => {
        if (!_.isNull(val) && !_.isUndefined(val)) {
          return <Tag color="red">{val}</Tag>
        }
        return ''
      }
    }
  ]
  let dataSource = bulidDataSource(userNameMap, roleNameMap, institutionsNameMap, info, res)
  return {columns, dataSource}
}

const buildNameMap = (data) => {
  return _.reduce(data, (total, current) => {
    total[current.id] = current.first_name || current.name
    return total
  }, {})
}

const buildUsersDraft = res => {
  let {
    rows = [],
    rowsDraft = []
  } = res
  if (!_.isArray(rows) || !rows.length) {
    return []
  }
  let result = rows.map(i => {
    return {
      ...i,
      checkInfo: _.get(i, 'SugoDataCheckings[0]')
    }
  })
  return result
}

function zipUser(user) {
  return {
    ...user,
    roles: user
      ?.roles
        ?.map(r => ({id: r.id, name: r.name, type: r.type}))
  }
}

const getUsersDraft = (query, cb) => {

  let {
    current,
    pageSize,
    search,
    audit_status,
    filterRoleId,
    institutionsId
  } = query

  return async dispatch => {
    setLoading(dispatch, true)

    let res = await Fetch.get(remoteUrl.GET_USERS_CHECK, {
      current,
      pageSize,
      search,
      audit_status,
      filterRoleId,
      institutionsId
    })

    setLoading(dispatch, false)

    let data = buildUsersDraft(res.result)

    let action1 = {
      type: 'set_usersDraft',
      data
    }
    if (res) 
      dispatch(action1)
    _.isFunction(cb) && cb(res.result)
  }
}

const addUserDraft = (user, callback) => {

  return async dispatch => {

    setLoading(dispatch, true)
    let res = await Fetch.post(remoteUrl.ADD_USER_CHECK, {
      // 移除多余信息，避免日志增长过快
      user: zipUser(user)
    })
    setLoading(dispatch, false)
    let data = {
      ...res.result,
      roles: user.roles
    }
    let action = {
      type: 'add_users',
      data
    }
    if (res) 
      dispatch(action)
    if (_.isFunction(callback)) 
      callback(res)

  }

}

const delUserDraft = (record, callback) => {

  return async dispatch => {

    let id = record.id
    let action = {
      type: 'del_users',
      data: record
    }

    setLoading(dispatch, true)
    let res = await Fetch.post(remoteUrl.DELETE_USER_CHECK, _.pick(record, ['id', 'username'])) // 带上 username 便于解释日志
    setLoading(dispatch, false)

    if (res) 
      dispatch(action)

    if (_.isFunction(callback)) 
      callback(res)

  }

}

const updateUserDraft = (user, cb) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch.post(remoteUrl.EDIT_USER_CHECK, {user: zipUser(user)})
    setLoading(dispatch, false)
    _.isFunction(cb) && cb(res)
  }
}

const submitOrRecall = (record, cb) => {
  return async dispatch => {
    let id = record.id
    setLoading(dispatch, true)
    let res = await Fetch.post(remoteUrl.SUBMIT_OR_RECALL, {id})
    setLoading(dispatch, false)
    _.isFunction(cb) && cb(res)
  }
}

const findOneUserDraft = ({id} = {}, cb) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch.post(remoteUrl.GET_USER_DRAFT, {id})
    setLoading(dispatch, false)
    _.isFunction(cb) && cb(res)
  }
}

const setCompareInfo = (info, cb) => {
  return async(dispatch, getState) => {
    let {id} = info
    let {users, roles, institutionsList} = getState().common
    let userNameMap = buildNameMap(users)
    let roleNameMap = buildNameMap(roles)
    let institutionsNameMap = buildNameMap(institutionsList)
    let query = {
      where: {
        id
      }
    }
    setLoading(dispatch, true)
    let res = await Fetch.post(remoteUrl.GET_USER, query)
    setLoading(dispatch, false)

    let {result} = res

    result = _.isNull(result) || _.isUndefined(result)
      ? {}
      : result

    info.groupType = 'draft'
    result.groupType = 'regular'
    result.roles = result.SugoRoles

    let data = buildColumnsAndData(info, result, userNameMap, roleNameMap, institutionsNameMap)

    let action = {
      type: 'set_compareInfo',
      data
    }
    dispatch(action)
    _.isFunction(cb) && cb()
  }
}

const auditUser = (user, {
  isPassed = false,
  suggestion = ''
} = {}, cb) => {
  return async(dispatch) => {
    let query = {
      user,
      isPassed,
      suggestion
    }
    setLoading(dispatch, true)
    let res = await Fetch.post(remoteUrl.AUDIT_USER, query)
    setLoading(dispatch, false)
    _.isFunction(cb) && cb()
  }
}

// 东莞农商行同步统一身份人平台用户记录
const syncUser = (callback) => {
  return async dispatch => {
    setLoading(dispatch, true)
    const res = await Fetch.get('/app/drcbank/syncUser')
    setLoading(dispatch, false)
    // const action1 = {   type: 'set_users',   data: buildUsers(res.result) }
    // if(res) dispatch(action1)
    if (_.isFunction(callback)) 
      callback(res)
  }
}

export {
  getUsersDraft,
  updateUserDraft,
  setCompareInfo,
  auditUser,
  submitOrRecall,
  addUserDraft,
  delUserDraft,
  findOneUserDraft,
  syncUser
}
