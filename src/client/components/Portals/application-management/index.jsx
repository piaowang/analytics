import { CheckCircleOutlined, CloseCircleOutlined, RollbackOutlined } from '@ant-design/icons'
import { Button, Checkbox, Input, message } from 'antd'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import Applictions from './applications'
import CreateTag from './createTag'
import AppTagTree from './appTagTree'
import { changeTagAppOrder } from './store/queryhelper'
import {
  appTagOrderSagaSyncModelGen,
  appTagSagaSyncModelGen,
  makeTagTree,
  portalTagOrderSagaSyncModelGen,
  TAG_APP_ORDER_SAGA_MODEL_NS,
  TAG_ORDER_SAGA_MODEL_NS,
  TAGS_SAGA_MODEL_NS
} from './store'
import _ from 'lodash'

import Icon1 from './images/icon_Management@2x.svg'
import Icon2 from './images/icon_sort@2x.svg'
import Icon3 from './images/icon_Management@2x-1.svg'
import Icon4 from './images/icon_sort@2x-1.svg'
import { dictBy } from '../../../../common/sugo-utils'
import Bread from '../../Common/bread'
import HorizontalSplitHelper from '../../Common/horizontal-split-helper'
import { useRuntimeSagaModels } from '../../Common/runtime-saga-helper'
import { connect } from 'react-redux'
import appMgrSagaModel, { APP_MGR_SAGA_MODEL_NS } from './models'

const { Search } = Input

//标签管理
function ApplicationShow(props) {
  const { tagList, tagOrders, tagAppOrder, gState } = props
  const [isOrderingTags, setIsChangingTagOrder] = useState(false)

  const [mouseOverLeft, changeMouseOverLeft] = useState(false)
  const [mouseOverRight, changeMouseOverRight] = useState(false)

  useRuntimeSagaModels(props, [
    appTagSagaSyncModelGen(TAGS_SAGA_MODEL_NS),
    appTagOrderSagaSyncModelGen(TAG_APP_ORDER_SAGA_MODEL_NS),
    portalTagOrderSagaSyncModelGen(TAG_ORDER_SAGA_MODEL_NS),
    () => appMgrSagaModel
  ])

  const tagAppOrder_tagId_map = dictBy(
    tagAppOrder,
    tagAppOrder => tagAppOrder?.tagId,
    v => v?.appIdOrder
  )

  const tree = makeTagTree(tagList, tagOrders)

  const { checkedTag, selectedTag, editingOrderAppMap, rightContentView, applicationVal, checkList = [] } = gState || {}
  //展开的标签
  const [expandedTag, setexpandedTag] = useState([])

  const [orderChanged, setOrderChanged] = useState('')

  const [tagSearchVal, setTagSearchVal] = useState('')

  const { dispatch } = window.store

  const easyDispatch = payload => {
    dispatch({
      type: 'application-management/change',
      payload
    })
  }
  const setCheckList = checkList => easyDispatch({ checkList })
  const setCheckedTag = checkedTag => easyDispatch({ checkedTag })
  const setRightContentView = rightContentView => easyDispatch({ rightContentView })
  const setApplicationVal = applicationVal => easyDispatch({ applicationVal })

  // 创建标签分类
  function changeMode(mode) {
    setRightContentView(mode)
  }

  useEffect(() => {
    easyDispatch({ editingOrderAppMap: tagAppOrder_tagId_map })
  }, [JSON.stringify(tagAppOrder_tagId_map)])

  const isCreateTag = rightContentView === 'main-tree-right-tag-type-create'
  const isEditing = rightContentView === 'main-tree-right-tag-type-edit'
  const isOrderingApp = rightContentView === 'changeAppOrder'

  function renderButtonGroup() {
    return (
      <React.Fragment>
        <Button
          style={{ marginRight: '64px' }}
          type='primary'
          onClick={() => {
            if (_.isEmpty(checkList)) return message.error('请先选择应用')
            easyDispatch({ modalState: 'addTagModal' })
          }}
        >
          标签设置
        </Button>
      </React.Fragment>
    )
  }

  let appIdMap = {}
  function filterApp(raw = []) {
    let selected = checkedTag?.checked
    if (isOrderingApp) selected = [selectedTag]
    if (_.isEmpty(selected)) {
      if (!applicationVal) return raw
      return raw.filter(i => (i?.name || '').includes(applicationVal))
    }

    let appList = []
    selected.map(i => {
      appList = _.union(appList, _.get(tagAppOrder_tagId_map, i, []))
    })
    appList = appList.map(i => appIdMap[i])
    return appList
  }

  _.get(gState, 'application', []).map(i => {
    if (!appIdMap[i.id]) appIdMap[i.id] = i
  })

  const initCount = useMemo(() => {
    let filteredApplication = filterApp(gState?.application)

    //删除后内容为undefined，需要去掉undefined
    filteredApplication = _.compact(filteredApplication)

    filteredApplication =
      isOrderingApp && !_.isEmpty(editingOrderAppMap[selectedTag]) ? editingOrderAppMap[selectedTag].map(item => _.find(filteredApplication, { id: item })) : filteredApplication

    if (filteredApplication[0]?.type === 'add') filteredApplication.shift()
    return filteredApplication
  })

  const tagTreeRef = useRef()

  function renderTagManageBtn() {
    if (isOrderingApp || isCreateTag || isEditing) {
      return null
    }

    return (
      <span className='fright itblock font16'>
        <img
          src={mouseOverLeft ? Icon3 : Icon1}
          className='pointer'
          style={{ color: mouseOverLeft ? '#6969d7' : '#848688' }}
          onMouseEnter={() => {
            changeMouseOverLeft(true)
          }}
          onMouseLeave={() => {
            changeMouseOverLeft(false)
          }}
          title='标签管理'
          type='control'
          onClick={() => {
            changeMode('main-tree-right-tag-type-edit')
            easyDispatch({ selectedTag: _.get(tree, '[0].id', '') })
            setIsChangingTagOrder(false)
            setCheckedTag([])
          }}
        />
      </span>
    )
  }

  function renderAppOrderingBtn() {
    if (isOrderingApp) {
      return (
        <span title='退出排序' className='fright itblock font16'>
          <RollbackOutlined
            onClick={async () => {
              changeMode('')
              setRightContentView('')
              let editingOrderApp = !_.isEmpty(editingOrderAppMap)
                ? Object.keys(editingOrderAppMap).map(tagId => ({
                    tagId, // TODO test
                    appIdOrder: editingOrderAppMap[tagId]
                  }))
                : []

              editingOrderApp.map(async item => {
                let res = await changeTagAppOrder(item)
              })
              setOrderChanged('change')
              easyDispatch({ selectedTag: '' })
              message.success('保存成功')
            }}
          />
        </span>
      )
    } else if (isCreateTag || isEditing) {
      return null
    }
    return (
      <span style={{ marginRight: '10px' }} className='fright itblock font16'>
        <img
          src={mouseOverRight ? Icon4 : Icon2}
          className='pointer'
          style={{ color: mouseOverRight ? '#6969d7' : '#848688' }}
          onMouseEnter={() => {
            changeMouseOverRight(true)
          }}
          onMouseLeave={() => {
            changeMouseOverRight(false)
          }}
          title='显示顺序'
          type='ordered-list'
          onClick={() => {
            changeMode('changeAppOrder')
            setCheckedTag([])
            setApplicationVal('')
          }}
        />
      </span>
    )
  }

  function renderTagOrderingBtn() {
    if (!isEditing) {
      return null
    }
    if (isOrderingTags) {
      return (
        <span title='保存并退出排序' className='fright itblock font16'>
          <CheckCircleOutlined
            className='mg2r pointer'
            title='保存排序'
            onClick={async () => {
              setIsChangingTagOrder(false)
              let { nextTagOrders, nextTags } = tagTreeRef.current.getNextTagAndOrders()
              await new Promise((resolve, reject) => {
                window.store.dispatch({
                  type: `${TAG_ORDER_SAGA_MODEL_NS}/sync`,
                  payload: nextTagOrders,
                  callback: syncRes => {
                    resolve()
                  }
                })
              })

              window.store.dispatch({
                type: `${TAGS_SAGA_MODEL_NS}/sync`,
                payload: nextTags,
                callback: syncRes => {
                  // if (!_.isEmpty(syncRes.resUpdate)) {}
                  message.success('保存标签顺序成功')
                }
              })
            }}
          />
          <CloseCircleOutlined
            className='mg2r pointer'
            title='取消排序'
            onClick={() => {
              tagTreeRef.current.restoreTagOrders()
              setIsChangingTagOrder(false)
            }}
          />
        </span>
      )
    }

    return (
      <span style={{ marginRight: '10px' }} className='fright itblock font16'>
        <img
          src={mouseOverRight ? Icon4 : Icon2}
          className='pointer'
          style={{ color: mouseOverRight ? '#6969d7' : '#848688' }}
          onMouseEnter={() => {
            changeMouseOverRight(true)
          }}
          onMouseLeave={() => {
            changeMouseOverRight(false)
          }}
          title='调整标签排序'
          onClick={() => {
            setCheckedTag([])
            setIsChangingTagOrder(true)
            easyDispatch({ selectedTag: '' })
          }}
        />
      </span>
    )
  }

  return (
    <div id='portal-application-manager' className='height-100 width-100' style={{ background: '#e4eaef' }}>
      <Bread path={[{ name: '系统管理' }, { name: '应用管理' }]}>{null}</Bread>
      <HorizontalSplitHelper className='height-100 split-helper'>
        <div
          className='itblock split-helper mari7 bg-white'
          style={{
            boxSizing: 'border-box',
            overflowX: 'auto',
            backgroundColor: '#E7E9EB',
            padding: '10px 0 0 10px'
          }}
          defaultWeight={250}
        >
          <div className='overscroll-auto-y' style={{ height: 'calc(100vh - 48px - 40px)', backgroundColor: '#ffffff', padding: '16px', borderRadius: '4px' }}>
            <div
              className='mg2b'
              style={{
                lineHeight: '20px',
                height: '20px'
              }}
            >
              <div style={{ paddingRight: '5px', minWidth: '200px' }}>
                <span
                  className='fleft mg3r'
                  style={{
                    color: '#333',
                    height: '20px',
                    lineHeight: '20px'
                  }}
                >
                  标签分组
                </span>
                <React.Fragment>
                  {renderTagManageBtn()}
                  {renderTagOrderingBtn()}
                  {renderAppOrderingBtn()}
                </React.Fragment>
              </div>
            </div>
            <div>
              <AppTagTree
                ref={tagTreeRef}
                checkedTag={checkedTag}
                expandedTag={expandedTag}
                selectedTag={selectedTag}
                setCheckedTag={setCheckedTag}
                setexpandedTag={setexpandedTag}
                rightContentView={rightContentView}
                changeTagOrder={isOrderingTags}
                setChangeTagOrder={setIsChangingTagOrder}
                tagSearchVal={tagSearchVal}
                setTagSearchVal={setTagSearchVal}
              />
            </div>
          </div>
        </div>

        <div
          className='itblock pd2 overscroll-auto-y overscroll-auto-x'
          defaultWeight={1400}
          style={{ height: 'calc(100% - 40px)', boxSizing: 'border-box', padding: '10px', paddingLeft: '5px' }}
        >
          <div style={{ padding: '16px', borderRadius: '4px', height: '100%', backgroundColor: '#ffffff', overflow: 'hidden', minWidth: '1100px' }}>
            {isCreateTag || isEditing ? (
              <CreateTag reuseSagaModel changeMode={changeMode} isEditing={isEditing} selectedTag={selectedTag} setRightContentView={setRightContentView} />
            ) : (
              <React.Fragment>
                <div className='pd1 relative'>
                  {rightContentView === 'changeAppOrder' ? null : (
                    <Search
                      className='my-search'
                      allowClear
                      style={{ width: '240px', height: '32px' }}
                      placeholder='请输入应用名称'
                      defaultValue={applicationVal || undefined}
                      onSearch={value => {
                        setApplicationVal(value)
                      }}
                    />
                  )}
                  {!isOrderingApp ? <span style={{ fontSize: '14px', marginLeft: '20px', color: '#6969D7' }}>{`共${initCount.length}个符合应用`}</span> : null}
                  <Checkbox
                    style={{ marginLeft: '10px', fontSize: '12px' }}
                    onChange={e => {
                      let initCountIds = initCount.map(item => item.id)
                      if (e.target.checked) {
                        return setCheckList(_.union(initCountIds, checkList))
                      }

                      setCheckList(checkList.filter(i => !initCountIds.includes(i)))
                    }}
                    checked={
                      checkList.length &&
                      _.isEqual(
                        _.intersection(
                          checkList,
                          initCount.map(i => i.id)
                        )
                          .sort()
                          .toString(),
                        initCount
                          .map(i => i.id)
                          .sort()
                          .toString()
                      )
                    }
                  >
                    全选/全取消
                  </Checkbox>

                  <div className='vertical-center-of-relative right0'>{isOrderingApp ? null : renderButtonGroup()}</div>
                </div>
                <Applictions
                  batchOperation={checkList.length > 1}
                  rightContentView={rightContentView}
                  expandedTag={expandedTag}
                  checkedTag={checkedTag?.checked}
                  editingOrderAppMap={editingOrderAppMap}
                  selectedTag={selectedTag}
                  applicationVal={applicationVal}
                  orderChanged={orderChanged}
                  setOrderChanged={setOrderChanged}
                  checkList={checkList}
                  setCheckList={setCheckList}
                />
              </React.Fragment>
            )}
          </div>
        </div>
      </HorizontalSplitHelper>
    </div>
  )
}

export default _.flow([
  connect(state => {
    return {
      tagList: _.get(state, [TAGS_SAGA_MODEL_NS, 'applicationTags']) || [],
      tagOrders: _.get(state, [TAG_ORDER_SAGA_MODEL_NS, 'tagOrders']) || [],
      tagAppOrder: _.get(state, [TAG_APP_ORDER_SAGA_MODEL_NS, 'tagAppOrders']) || [],
      gState: _.get(state, APP_MGR_SAGA_MODEL_NS)
    }
  })
])(ApplicationShow)
