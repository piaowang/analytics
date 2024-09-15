import React, { useState, useEffect, useRef } from 'react'
import AppItem from './appItem'
import { MuuriComponent } from "muuri-react";
import { layoutOptions } from "./utils";
import _ from 'lodash'
import './listcontainer.css'

export default function Listcontainer(props) {

  const muuriRef = useRef()

  let { 
    tagAppOrderTagIdMap,
    setTagAppOrderTagIdMap,
    allApps,
    appIdMap,
    isOrdering,
    batchOperation,
    reuseSagaModel,
    showModal,
    setApp,
    checkList,
    setCheckList,
    setModalState,
    selectedTag,
  } = props

  useEffect(() => {
    let map = {}
    muuriRef.current.on("dragReleaseEnd", (arrs) => {
      allApps.map( i => {
         map[i.id] = i
      })
      let next = muuriRef.current._items.map(i => i._component.key.split('|')[0])
      setTagAppOrderTagIdMap({
        ...tagAppOrderTagIdMap,
        [selectedTag]: next
      })
    })
  }, [JSON.stringify(selectedTag)])
  
  const target = _.get(tagAppOrderTagIdMap, selectedTag, []).map( i => appIdMap[i])
  const children = target.map((i,idx) => (
    <AppItem
      key={i.id + '|' + selectedTag}
      isOrdering={isOrdering}
      batchOperation={batchOperation}
      reuseSagaModel={reuseSagaModel}
      showModal={showModal}
      item={props.item}
      checkList={checkList}
      setCheckList={setCheckList}
      setModalState={setModalState}
      setApp={setApp}
      app={i}
      sortOrder={idx}
    />
  ));

  return (
    <MuuriComponent
      ref={muuriRef}
      {...layoutOptions}
      propsToData={({ sortOrder }) => ({ sortOrder })}
      sort={"sortOrder"}
      dragEnabled={true}
    >
      {children}
    </MuuriComponent>
  )
}




