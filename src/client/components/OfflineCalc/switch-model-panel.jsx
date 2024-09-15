import React from 'react'
import classNames from 'classnames'
import { AppstoreFilled } from '@ant-design/icons';
import {withCommonFilterDec} from '../Common/common-filter'
import smartSearch from '../../../common/smart-search'
import {connect} from 'react-redux'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import {modelsSagaModelGenerator} from './saga-model-generators'

const namespace = 'switch-model-panel'

let mapStateToProps = (state, ownProps) => {
  const modelState = state[namespace] || {}
  return {
    ...modelState
  }
}


@connect(mapStateToProps)
@withRuntimeSagaModel(modelsSagaModelGenerator(namespace))
@withCommonFilterDec()
export default class SwitchModelPanel extends React.Component {
  state = {
    visiblePopoverKey: '',
    pendingTagName: ''
  }
  
  render() {
    let {offlineCalcModels, keywordInput: SearchBox, searching, panelTitle, selectedModelId, onModelSelected} = this.props
    const filteredModels = searching
      ? (offlineCalcModels || []).filter(tag => smartSearch(searching, tag.name))
      : (offlineCalcModels || [])
    return (
      <React.Fragment>
        <div style={{padding: '0 12px'}}>
          <div style={{padding: '16px 0 16px'}} className="alignright">
            <span className="fleft">{panelTitle}</span> {'\u00a0'}
          </div>
          <SearchBox placeholder="搜索指标模型..." />
        </div>
    
        <div style={{marginTop: '10px'}}>
          {filteredModels.map(model => {
            return (
              <div
                key={model.id || 'default'}
                className={classNames('usergroup-tag-list-item fpointer alignright hover-display-trigger', {
                  active: !selectedModelId ? !model.id : model.id === selectedModelId
                })}
                onClick={() => onModelSelected && onModelSelected(model)}
              >
                <span className="fleft">
                  <AppstoreFilled className="mg1r" />{model.title || model.name}
                </span>
              </div>
            );
          })}
        </div>
      </React.Fragment>
    );
  }
}
