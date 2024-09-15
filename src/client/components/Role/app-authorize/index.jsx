import React, { useEffect } from 'react'
import { Checkbox, Pagination, Input, message } from 'antd'
import withRuntimeSagaModel from '../../Common/runtime-saga-helper'
import {connect} from 'react-redux'
import { applicationSagaSyncModelGen, appTagSagaSyncModelGen } from './models/sagasyncgen'
import './index.styl'
import SearchTreeSelect from './treeSearcher/selectComp'
import InputSearch from './treeSearcher/inputComp'
import _ from 'lodash'

//应用权限管理
function AppAuth(props) {

  const dispatch = props.dispatch

  useEffect(() => {
    //todo 在主应用中刷新角色权限页面 此处不会触发
    let role = _.get(props, 'role')
    if (_.isEmpty(role.appIds)) return


    dispatch({
      type: 'appAuthorizeApplication/changeState',
      payload: {
        checkedApp: role.appIds
      }
    })
  }, [JSON.stringify(_.get(props, 'role'))])

  function changeStore(payload) {
    dispatch({
      type: 'appAuthorizeApplication/changeState',
      payload
    })
  }
  
  const apps = _.get(props, 'appAuthorizeGetapp', {})
  const store = _.get(props, 'appAuthorizeApplication', {})
  const tags = _.get(props, 'appAuthorizeGetTag.applicationTag', {}) 


  const { checkedApp = [], selectedTag = [], currentPage, pageSize, appNameSearchVal } = store

  const { application = [] } = apps

  function changePagination(page, pageSize) {
    changeStore({
      currentPage: page - 1,
      pageSize
    })
  }

  let tagAppMap = tags.tagAppOrder_tagId_map || {}
  const appIdMap = {}
  application.map( i => {
    if (!appIdMap[i.id]) appIdMap[i.id] = i
  })

  let appsList = genAppsList({selectedTag, tagAppMap, appIdMap, application, currentPage, pageSize, appNameSearchVal})

  return (
    <div id="app-authorize" className="height-100 width-100">

      <div className="filter-box">
        <div className="app-authorize-treeselect mg2x">
          <SearchTreeSelect />
          <InputSearch 
            dispatch={dispatch}
          />
        </div>
      </div>

      <div className="select-all-box mg2y">
        <Checkbox
          className="mg2l"
          //是否选中需要判断 判断当前展示的元素是否都选中了
          //e.target.checked === true 把剩下的全选上
          //e.target.checked === false 当前页面的元素全取消
          checked={_.isEqual(_.intersection(appsList.map( i => i.id), checkedApp), appsList.map(i => i.id))}
          onChange={e => {
            //全选
            if (e.target.checked) {
              let next = _.cloneDeep(checkedApp)
              appsList.map( i => !checkedApp.includes(i.id) && next.push(i.id))
              changeStore({
                checkedApp: next
              })
              return
            }

            //全取消
            changeStore({
              checkedApp: checkedApp.filter( i => appsList.map(j => i.id).includes(i))
            })
          }}
        >
          全选/全取消
        </Checkbox>
      </div>

      <div className="app-selectbox">
        {
          _.isEmpty(appsList) ? <div className="mg2l">当前没有应用</div> : null
        }
        {
          appsList.map(item => (
            <div
              className="app-selectbox-item mg2x mg2b pointer"
              key={item.id}
              onClick={e => {
                changeStore({
                  checkedApp: _.includes(checkedApp, item.id) ? checkedApp.filter( i => i !== item.id) : [...checkedApp, item.id]
                })
              }}
            >
              <div className="app-selectbox-item-top width-100">
                {_.isEmpty(item.img)
                  ? <span>暂无缩略图</span>
                  : <img className="width-100 height-100" alt="图片"
                    src={item.img}
                  />
                }
              </div>
              <div 
                className="app-selectbox-item-bottom"
                title={item.name}
              >
                <Checkbox 
                  className="itblock mg1r"
                  onChange={e => {
                    changeStore({
                      checkedApp: e.target.checked ? [...checkedApp, item.id] : checkedApp.filter( i => i !== item.id)
                    })
                  }}
                  checked={_.includes(checkedApp, item.id)}
                />
                <span 
                  className="width-70 elli itblock"
                >
                  {item.name}
                </span>
              </div>
            </div>
          ))
        }
      </div>

      {
        _.isEmpty(selectedTag) && !appNameSearchVal
          ? <div className="app-authorize-pagination">
            <Pagination 
              current={currentPage + 1}
              pageSize={pageSize}
              size="small" 
              total={application.length} 
              onChange={changePagination}
              onShowSizeChange={changePagination}
              showSizeChanger 
              showQuickJumper 
            />
          </div>
          : null
      }
    </div>
  )
}


function genAppsList({selectedTag, tagAppMap, appIdMap, application, currentPage, pageSize, appNameSearchVal}) {
  let appsList = []
  selectedTag.map( i => {
    if (!tagAppMap[i]) return
    appsList.push(...tagAppMap[i])
  })
  appsList = _.union(appsList)
  appsList = appsList.map( i => appIdMap[i])
  appsList = _.compact(appsList)
  if (_.isEmpty(selectedTag)) appsList = application.slice(currentPage * pageSize, currentPage * pageSize + pageSize)

  if (appNameSearchVal) {
    appsList = appsList.filter(i => (i.name || '').includes(appNameSearchVal))
  }

  return appsList
}

export default withRuntimeSagaModel([
  applicationSagaSyncModelGen('appAuthorizeGetapp'), 
  appTagSagaSyncModelGen('appAuthorizeGetTag')
])(connect((state) => ({
  appAuthorizeApplication: state.appAuthorizeApplication,
  appAuthorizeGetTag: state.appAuthorizeGetTag,
  appAuthorizeGetapp: state.appAuthorizeGetapp
}))(AppAuth)) 
