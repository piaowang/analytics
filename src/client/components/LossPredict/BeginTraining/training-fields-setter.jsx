import React from 'react'
import _ from 'lodash'
import { CloseOutlined } from '@ant-design/icons';
import { Checkbox, Button } from 'antd';
import classNames from 'classnames'
import {immutateUpdate} from '../../../../common/sugo-utils'

const TypeSortOrder = {
  LossPredictField: 0,
  UserId: 1,
  Integer: 2,
  Long: 3,
  Float: 4,
  Char: 5,
  DateTime: 6
}

export default class TrainingFieldSetter extends React.Component {
  state = {
    tempTrainingFields: []
  }

  componentWillMount() {
    let {lossPredictModel} = this.props
    if (lossPredictModel) {
      this.setState({tempTrainingFields: _.get(lossPredictModel, 'training_settings.trainingFields') || []})
    }
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(nextProps.lossPredictModel, this.props.lossPredictModel) && nextProps.lossPredictModel) {
      let {lossPredictModel} = nextProps
      this.setState({tempTrainingFields: _.get(lossPredictModel, 'training_settings.trainingFields') || []})
    }
  }

  renderNextStepPart() {
    let {updateHashStateByPath, updateLossPredictModel, lossPredictModel, reloadLossPredictModels} = this.props
    let {tempTrainingFields} = this.state

    return (
      <div className="height100 relative bordert dashed">
        <Button
          className="vertical-center-of-relative mg3l width150"
          onClick={() => updateHashStateByPath('step', step => step - 1)}
        >上一步</Button>

        <Button
          className="center-of-relative width150"
          type="primary"
          disabled={tempTrainingFields.length <= 2}
          onClick={async () => {
            let res = await updateLossPredictModel({
              id: lossPredictModel.id,
              training_settings: immutateUpdate(lossPredictModel.training_settings, 'trainingFields', () => tempTrainingFields)
            })
            if (res) {
              await reloadLossPredictModels()
              updateHashStateByPath('step', step => step + 1)
            }
          }}
        >下一步</Button>
      </div>
    )
  }

  onTrainingFieldRemove = ev => {
    let colName = ev.target.getAttribute('data-col-name')
    this.setState(prevState => {
      return {
        tempTrainingFields: prevState.tempTrainingFields.filter(fi => fi !== colName)
      }
    })
  }

  render() {
    let {style, lossPredictModel} = this.props
    let columnsTypeDict = _.get(lossPredictModel, 'training_settings.columnsTypeDict') || {}
    let {tempTrainingFields} = this.state
    let orderedColumns = _.orderBy(_.keys(columnsTypeDict), colName => TypeSortOrder[columnsTypeDict[colName]])

    let trainingFieldsSet = new Set(tempTrainingFields)

    let colCount = _.keys(columnsTypeDict).length
    return (
      <div className="bordert dashed" style={style}>

        <div
          className="mg3l mg2r mg2y border itblock"
          style={{width: `calc(50% - ${32 + 16}px)`, height: `calc(100% - ${100 + 32}px)`}}
        >
          <div className="height40 bg-ddd color-333 line-height40 pd3l">字段列表</div>
          <div className="overscroll-y" style={{height: 'calc(100% - 40px)'}}>
            <Checkbox
              className="block height60 line-height60 pd3x mg0 corner-checkbox font14"
              checked={tempTrainingFields.length === colCount}
              indeterminate={tempTrainingFields.length !== 0 && tempTrainingFields.length !== colCount}
              onChange={ev => {
                if (ev.target.checked) {
                  this.setState({tempTrainingFields: orderedColumns})
                } else {
                  this.setState({tempTrainingFields: orderedColumns.filter(colName => {
                    return columnsTypeDict[colName] === 'LossPredictField' || columnsTypeDict[colName] === 'UserId'
                  })})
                }
              }}
            >全选</Checkbox>

            {orderedColumns.map((colName) => {
              let disabled = columnsTypeDict[colName] === 'LossPredictField' || columnsTypeDict[colName] === 'UserId'
              return (
                <Checkbox
                  className={classNames('block height40 line-height40 pd3x bordert corner-checkbox font14', {
                    'bg-grey-f5 disabled': disabled
                  })}
                  style={{marginRight: '0px'}}
                  key={colName}
                  disabled={disabled}
                  onChange={ev => {
                    if (ev.target.checked) {
                      this.setState({tempTrainingFields: [...tempTrainingFields, colName]})
                    } else {
                      this.setState({tempTrainingFields: tempTrainingFields.filter(fi => fi !== colName)})
                    }
                  }}
                  checked={trainingFieldsSet.has(colName)}
                >{colName}</Checkbox>
              )
            })}
          </div>
        </div>

        {/* 已勾选的字段列表 */}

        <div
          className="mg3r mg2l mg2y border itblock"
          style={{width: `calc(50% - ${32 + 16}px)`, height: `calc(100% - ${100 + 32}px)`}}
        >
          <div className="height40 bg-ddd color-333 line-height40 pd3l">已勾选的字段列表</div>
          <div className="height60 pd3x line-height60">
            目标字段
            <span
              className="mg2l pd2x"
              style={{border: '1px solid #6e30ba', color: '#6e30ba'}}
            >{orderedColumns[0]}</span>

            <span className="mg2l">用户唯一标识</span>
            <span
              className="mg2l pd2x"
              style={{border: '1px solid #6e30ba', color: '#6e30ba'}}
            >{orderedColumns[1]}</span>
          </div>

          <div className="bordert pd3l height60 line-height60">训练特征字段</div>
          <div
            className="bordert pd2t pd3l pd2r overscroll-y"
            style={{height: `calc(100% - ${40 + 60 * 2}px)`}}
          >
            {_.drop(tempTrainingFields, 2).map(tf => {
              return (
                <div
                  key={tf}
                  className="itblock width140 bg-ddd pd2l pd3r mg2b mg2r relative elli"
                >
                  {tf}
                  <CloseOutlined
                    className="pointer vertical-center-of-relative right0"
                    data-col-name={tf}
                    style={{marginRight: '10px'}}
                    onClick={this.onTrainingFieldRemove} />
                </div>
              );
            })}
          </div>
        </div>

        {this.renderNextStepPart()}
      </div>
    );
  }
}
