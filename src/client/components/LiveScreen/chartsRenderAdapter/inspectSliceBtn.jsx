import React, {useState} from 'react'
import Icon2 from '../../Common/sugo-icon'
import {message, Modal} from 'antd'
import Chart from '../chart'
import _ from 'lodash'
import {connect} from 'react-redux'
import {NewVizTypeNameMap} from '../constants'
import './inspect-slice-btn.styl'
import { ClassNames } from '@emotion/core'


const InspectSliceBtn0 = props => {
  const { params, styleConfig = {}, className, components } = props
  const {
    color,
    size,
    fontWeight,
    rotate,
    iconType,
    iconSrc,
    modalWidth,
    modalHeight,
    modelCloseColor,
    modelCloseSize,
    visibleOn, // always | hoverSomeComponent | hoverTargetComponent
    candidateHoverComponentId,
    targetComponentId
  } = styleConfig || {}
  const [popoverComponentId, setPopoverComponentId] = useState(null)
  
  let component = targetComponentId && _.find(components, sc => sc.id === targetComponentId)
  return (
    <React.Fragment>
      <div
        className={`height-100 relative ${className}`}
        onClick={() => {
          if (!targetComponentId) {
            message.warn('未设置目标组件')
            return
          }
          setPopoverComponentId(targetComponentId)
        }}
      >
        {iconType === 'antd'
          ? (
            <Icon2
              type={iconSrc}
              className="center-of-relative pointer"
              style={{
                color,
                transform: `translate(-50%, -50%) rotate(${rotate || 0}deg)`,
                fontSize: size,
                fontWeight
              }}
            />
          ) : (
            <img
              className="center-of-relative pointer"
              style={{
                transform: `translate(-50%, -50%) rotate(${rotate || 0}deg)`,
                width: size,
                height: size
              }}
              src={iconSrc}
              alt=""
            />
          )}
      </div>
      <ClassNames>
        {({css, cx}) => {
          return (
            <Modal
              title={component ? _.get(component.style_config, 'componentName') || NewVizTypeNameMap[component.type] || component.type : undefined}
              visible={!!popoverComponentId}
              footer={null}
              width={modalWidth || window.innerWidth * 1172/1920}
              onCancel={() => setPopoverComponentId(null)}
              bodyStyle={{
                padding: 0,
                height: modalHeight || `${window.innerWidth * 660 / 1920}px`
              }}
              wrapClassName={`inspect-slice-modal ${css({
                '.ant-modal-close span': {
                  color: modelCloseColor,
                  fontSize: `${modelCloseSize}px`
                }
              })}`}
              destroyOnClose
            >
              {!component
                ? (
                  <div className="aligncenter pd3 color-gray font24">未设置目标组件或组件已被删除</div>
                )
                : (
                  <div className="height-100">
                    <Chart {...component} modalStyle={{
                      width: modalWidth || window.innerWidth * 1172/1920
                    }}/>
                  </div>
                )}
            </Modal>
          )
        }}
      </ClassNames>
    </React.Fragment>
  )
}

const InspectSliceBtn = connect(state => {
  return {
    components: _.get(state, 'livescreen_workbench.screenComponents') || []
  }
})(InspectSliceBtn0)
export {InspectSliceBtn}
