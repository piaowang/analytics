import Fetch from '../common/fetch-final'
import buildTree from '../common/build-tree'
import {message} from 'antd'
import {remoteUrl} from '../constants/interface'
import _ from 'lodash'
import {setLoading} from './common'

function rebuildDashboards(data) {
  let user = window.sugo.user
  let user_id = user.id
  let {slices, shareRoles} = data.result
  const tree = slices.reduce((prev, curr) => {
    let id = 'id' + curr.dashboard_id
    if (!prev[id]) prev[id] = []
    let slice = curr.Slice
    slice.table_id = (slice.Table || {}).id
    prev[id].push(slice)
    return prev
  }, {})

  const subscribeTree = data.result.subscribes.reduce((prev, curr) => {
    prev[curr.dashboard_id + ',' + curr.user_id] = true
    return prev
  }, {})

  const shareRolesTree = shareRoles.reduce((prev, curr) => {
    let {role_id, dashboard_id} = curr
    if (!prev[dashboard_id]) prev[dashboard_id] = []
    prev[dashboard_id].push(role_id)
    return prev
  }, {})

  let ds = data.result.dashboards.map(ds => {
    let obj = {}
    obj.slices = _.shuffle(tree['id' + ds.id])
    obj.sliceTree = buildTree(obj.slices)
    obj.subscribed = !!subscribeTree[ds.id + ',' + user_id]
    obj.shareRoles = shareRolesTree[ds.id] || []
    return Object.assign(obj, ds)
  })

  return ds
}

function rebuildSlices(res) {
  let {
    slices,
    subscribes,
    overviews,
    shareRoles = []
  } = res
  const subscribeTree = subscribes ? subscribes.reduce((prev, curr) => {
    prev[curr.slice_id] = true
    return prev
  }, {}) : {}
  const overviewTree = overviews ? overviews.reduce((prev, curr) => {
    prev[curr.slice_id] = true
    return prev
  }, {}) : {}
  const shareRolesTree = shareRoles.reduce((prev, curr) => {
    let {slice_id, role_id} = curr
    if (!prev[slice_id]) prev[slice_id] = []
    prev[slice_id].push(role_id)
    return prev
  }, {})
  
  let rr = (slices || res).map(r => {
    return {
      ...r,
      datasource: r.datasource_name,
      subscribed: !!subscribeTree[r.id],
      inOverview: !!overviewTree[r.id],
      shareRoles: shareRolesTree[r.id] || []
    }
  })
  return rr.sort((a, b) => {
    return a.updated_at > b.updated_at ? -1 : 1
  })
}

export const delDashboard = (record) => {
  return async dispatch => {
    let id = record.id
    let action = {
      type: 'del_dashboards',
      data: record
    }
    setLoading(dispatch, true)
    let res = await Fetch.post(remoteUrl.DELETE_DASHBOARD, {
      query: {
        where: {
          dashboard_id: id,
          // 为了日志解释方便而加入的字段
          dashboard_title: record.dashboard_title,
          datasource_id: record.datasource_id
        }
      }
    })
    setLoading(dispatch, false)
    if (res) {
      dispatch(action)
    }
    return res
  }
}

export const updateSlicesTag = (param) => {
  return async dispatch => {
    const {playLoad} = param
    const {target, data} = playLoad
    let action = {
      type: 'update_slices',
      data: data
    }
    setLoading(dispatch, true)
    let res = await Fetch.post(remoteUrl.UPDATE_SLICES_TAG, {
      query: {
        ...target
      }
    })
    setLoading(dispatch, false)
    if (res) {
      dispatch(action)
    }
    return res
  }
}

export const delSlice = record => {
  return async dispatch => {
    let id = record.id
    let action = {
      type: 'del_slices',
      data: record
    }
    let res = await Fetch.post(remoteUrl.DELETE_SLICES, {
      ids: [id],
      sliceNames: [record.slice_name],
      druid_datasource_id: record.druid_datasource_id
    })
    if(res) {
      dispatch(action)
    }
    return res
  }
}

export const getDashboards = () => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch.get(remoteUrl.GET_DASHBOARD)
    setLoading(dispatch, false)
    let action
    if(res) {
      if (res.result.dashboards) {
        action = {
          type: 'set_dashboards',
          data: rebuildDashboards(res)
        }
      }
      dispatch(action)
    }
    return res
  }
}

export const getSlices = (callback) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch.get('/app/slices/get/slices')
    setLoading(dispatch, false)
    let action1
    let action2
    if(res) {
      action1 = {
        type: 'set_slices',
        data: rebuildSlices(res)
      }
      action2 = {
        type: 'set_sliceTree',
        data: buildTree(action1.data)
      }
      dispatch(action1)
      dispatch(action2)
      if (callback) callback(action1)
    }
  }
}

export const getDashboardsCategory = () => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch.get('/app/dashboards-category/getlist')
    setLoading(dispatch, false)
    let action1
    if(res.success) {
      action1 = {
        type: 'set_dashboardsCategory',
        data: res.result
      }
      dispatch(action1)
    }
    return res
  }
}

export const updateDashboard = (
  id, update, slices, updateAll,globalFile
) => {
  return async dispatch => {
    let action = {
      type: 'update_dashboards',
      data: {
        id,
        ...updateAll
      }
    }
    setLoading(dispatch, true)
    let res = await Fetch.post(remoteUrl.EDIT_DASHBOARD, {
      query: {
        where: {
          id: id
        }
      },
      update: update,
      slices: slices.map(s => s.id),
      globalFile
    })
    setLoading(dispatch, false)
    if(res) {
      dispatch(action)
    }
    return res
  }
}

//todo: 合并两个方法
export const subscribeSlice = (id, subscribed, submit, callback) => {

  return async dispatch => {

    let action = {
      type: 'update_slices',
      data: Object.assign({
        id: id
      }, {
        subscribed: !subscribed
      })
    }

    //setLoading(dispatch, true)

    let res
    //subscribe
    if (!subscribed) {
      res = await Fetch.post(remoteUrl.ADD_SUBSCRIBE, {
        subscribe: submit
      })
    }

    //unsubscribe
    else {
      res = await Fetch.post(remoteUrl.DELETE_SUBSCRIBE, submit)
    }

    //setLoading(dispatch, false)

    if(res) {
      dispatch(action)

      if (callback) callback(action)
    }

  }

}

export const subscribeDashboard = (id, subscribed, submit, callback) => {

  return async dispatch => {

    let action = {
      type: 'update_dashboards',
      data: Object.assign({
        id: id
      }, {
        subscribed: !subscribed
      })
    }

    setLoading(dispatch, true)

    let res
    //subscribe
    if (!subscribed) {
      res = await Fetch.post(remoteUrl.ADD_SUBSCRIBE, {
        subscribe: submit
      })
    }

    //unsubscribe
    else {
      res = await Fetch.post(remoteUrl.DELETE_SUBSCRIBE, submit)
    }

    setLoading(dispatch, false)

    if(res) {
      dispatch(action)

      if (callback) callback(action)
    }

  }

}

export const addDashboard = (dashboardAll) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let dashboard = _.pick(
      dashboardAll,
      [
        'dashboard_title',
        'position_json',
        'description',
        'datasource_id',
        'params',
        'category_id'
      ]
    )
    let res = await Fetch.post(remoteUrl.ADD_DASHBOARD, {
      dashboard,
      slices: dashboardAll.slices.map(s => s.id)
    })
    setLoading(dispatch, false)
    if(res) {
      let action = {
        type: 'add_dashboards',
        data: {
          ...res.result,
          ...dashboardAll
        }
      }
      dispatch(action)
    }
    return res
  }
}

// 更新单个数据看板里的头部选中状态的实现
function updateCurrentDashboardSubscribed(subscribed) {
  let currentDashboard = _.cloneDeep(this.state.currentDashboard)
  currentDashboard.subscribed = !subscribed
  this.setState({
    currentDashboard
  })
}

export function updateSubscribe(ds) {
  let subscribed = ds.subscribed
  let submit
  if (subscribed) {
    submit = {
      query: {
        where: {
          dashboard_id: ds.id
        }
      }
    }
  } else {
    submit = {
      dashboard_id: ds.id
    }
  }
  //(id, subscribed, submit, callback)
  this.props.subscribeDashboard(ds.id, subscribed, submit, () => {
    updateCurrentDashboardSubscribed.bind(this, subscribed)()
    message.success(
      subscribed ? '已经取消订阅' : '订阅成功', 8
    )
  })
}

export async function updateSliceSubscribe(slice, callback = () => null) {
  let subscribed = slice.subscribed
  let submit
  if (subscribed) {
    submit = {
      query: {
        where: {
          slice_id: slice.id
        }
      }
    }
  } else {
    submit = {
      slice_id: slice.id
    }
  }

  let res
  //subscribe
  if (!subscribed) {
    res = await Fetch.post(remoteUrl.ADD_SUBSCRIBE, {
      subscribe: submit
    })
  }

  //unsubscribe
  else {
    res = await Fetch.post(remoteUrl.DELETE_SUBSCRIBE, submit)
  }

  if(res) {
    return callback(message.success(
      subscribed ? '已经取消订阅' : '订阅成功', 8
    ))
  }

}

export async function updateOverview(slice, callback) {
  let inOverview = slice.inOverview
  let url
  let submit = {
    where: {
      slice_id: slice.id
    }
  }
  if (inOverview) {
    url = remoteUrl.DELETE_OVERVIEW
  } else {
    url = remoteUrl.ADD_OVERVIEW
  }

  let action = {
    type: 'update_slices',
    data: {
      id: slice.id,
      inOverview: !inOverview
    }
  }

  let res = await Fetch.post(url, submit)

  if (res) {
    if (_.isFunction(callback)) callback(res)
    else this.props.setProp(action)

    message.success(
      inOverview ? '已经从概览移除' : '加入概览成功', 8
    )
  }
}

export const saveCopyAs = (params, callback) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch.post(remoteUrl.SAVECOPYAS_DASHBOARD, params)
    setLoading(dispatch, false)
    if(res) {
      typeof callback === 'function' && callback(res)
    }
    return res
  }
}
