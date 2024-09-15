import React, { useEffect, useState } from 'react'
import _ from 'lodash'
import AppModal from './creat-app-modal'
import AddTagModal from './addTagModal'
import ListContianer from './listcontainer.js'
// import ListContianerCanOrder from './listcontainer.bak.js'
import { appTagOrderSagaSyncModelGen, appTagRelationSagaSyncModelGen, appTagSagaSyncModelGen, TAG_APP_ORDER_SAGA_MODEL_NS, TAGS_SAGA_MODEL_NS } from './store'
import AppItem from './appItem'

import './index.styl'
import { useRuntimeSagaModels } from '../../Common/runtime-saga-helper'
import { dictBy } from '../../../../common/sugo-utils'
import { connect } from 'react-redux'
import { APP_MGR_SAGA_MODEL_NS } from './models'

function App(props) {
  const { modalState, selectedTag, editingOrderAppMap, getApplications, tagAppOrder, checkList, batchOperation, expandedTag, setCheckList } = props
  const { dispatch } = window.store

  const setModalState = modalState => {
    dispatch({
      type: 'application-management/change',
      payload: { modalState }
    })
  }

  const [app, setApp] = useState({})

  useRuntimeSagaModels(props, [
    appTagRelationSagaSyncModelGen('appTagRelation'),
    appTagSagaSyncModelGen(TAGS_SAGA_MODEL_NS),
    appTagOrderSagaSyncModelGen(TAG_APP_ORDER_SAGA_MODEL_NS)
  ])

  useEffect(() => {
    dispatch({
      type: `${TAGS_SAGA_MODEL_NS}/fetch`
    })
    dispatch({
      type: `${TAG_APP_ORDER_SAGA_MODEL_NS}/fetch`
    })
    props.setOrderChanged('')
  }, [props.orderChanged])

  const isOrdering = props?.rightContentView === 'changeAppOrder'

  let appIdMap = {}

  _.get(getApplications, 'application', []).map(i => {
    if (!appIdMap[i.id]) appIdMap[i.id] = i
  })
  const tagAppOrder_tagId_map = dictBy(
    tagAppOrder,
    tagAppOrder => tagAppOrder?.tagId,
    v => v?.appIdOrder
  )

  const showModal = state => {
    setModalState(state)
  }

  const handleCancel = e => {
    setModalState(false)
  }

  function filterApp(raw = []) {
    if (raw[0]?.type !== 'add' && !props.rightContentView && !props.applicationVal)
      raw.unshift({
        id: 'addNode',
        type: 'add'
      })

    let selected = props.checkedTag
    if (_.isEmpty(selected)) {
      if (!props.applicationVal) return raw
      return raw.filter(i => (i?.name || '').includes(props.applicationVal))
    }

    let appList = []
    selected.map(i => {
      appList = _.union(appList, _.get(tagAppOrder_tagId_map, i, []))
    })
    appList = appList.map(i => appIdMap[i])

    if (appList[0]?.type !== 'add' && !props.rightContentView && !props.applicationVal)
      appList.unshift({
        id: 'addNode',
        type: 'add'
      })
    return appList
  }

  let filteredApplication = filterApp(getApplications?.application)

  //删除后内容为undefined，需要去掉undefined
  filteredApplication = _.compact(filteredApplication)

  if (isOrdering && !selectedTag) {
    filteredApplication = []
  }

  if (isOrdering && selectedTag) {
    if (editingOrderAppMap[selectedTag]) filteredApplication = editingOrderAppMap[selectedTag].map(i => appIdMap[i]).filter(_.identity)
    else filteredApplication = []
  }

  return (
    <div
      style={{
        minWidth: '1200px',
        marginBottom: '78px',
        overflowY: 'auto',
        height: '100%'
      }}
    >
      <div>
        <AppModal
          visible={modalState === 'addApp' || modalState === 'editApp'}
          handleCancel={handleCancel}
          app={app}
          modalState={modalState}
          checkedTag={props?.checkedTag}
          reuseSagaModel
        />
        <AddTagModal
          reuseSagaModel
          visible={modalState === 'addTagModal'}
          handleCancel={handleCancel}
          application={_.get(getApplications, 'application', [])}
          checkList={checkList}
          batchOperation={batchOperation}
          cleanCheckList={() => setCheckList([])}
          expandedTag={expandedTag}
          app={app}
          setApp={setApp}
        />
        {isOrdering ? (
          <ListContianer apps={filteredApplication} />
        ) : (
          <div
            id='applications-management-layout'
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexWrap: 'wrap'
            }}
          >
            {filteredApplication.map(i => (
              <AppItem
                app={i}
                key={i.id + 'applications-management-layout-normal  '}
                showModal={showModal}
                setApp={setApp}
                setCheckList={setCheckList}
                setModalState={setModalState}
                checkList={checkList}
                isOrdering={isOrdering}
                reuseSagaModel
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default _.flow([
  connect(state => {
    return {
      modalState: state[APP_MGR_SAGA_MODEL_NS]?.modalState,
      selectedTag: state[APP_MGR_SAGA_MODEL_NS]?.selectedTag,
      editingOrderAppMap: state[APP_MGR_SAGA_MODEL_NS]?.editingOrderAppMap,
      getApplications: state[APP_MGR_SAGA_MODEL_NS],
      tagAppOrder: _.get(state, [TAG_APP_ORDER_SAGA_MODEL_NS, 'tagAppOrders']) || []
    }
  })
])(App)
