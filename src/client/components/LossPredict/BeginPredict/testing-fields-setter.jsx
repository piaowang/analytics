import React from 'react'
import _ from 'lodash'
import { CloseOutlined } from '@ant-design/icons';
import { Checkbox, Button } from 'antd';
import classNames from 'classnames'

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

  componentDidMount() {
    let {columnsTypeDict, updateHashStateByPath} = this.props
    let orderedColumns = _.orderBy(_.keys(columnsTypeDict), colName => TypeSortOrder[columnsTypeDict[colName]])
    updateHashStateByPath('testingFields', () => orderedColumns)
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(nextProps.columnsTypeDict, this.props.columnsTypeDict)) {
      let {columnsTypeDict, updateHashStateByPath} = nextProps
      let orderedColumns = _.orderBy(_.keys(columnsTypeDict), colName => TypeSortOrder[columnsTypeDict[colName]])
      updateHashStateByPath('testingFields', () => orderedColumns)
    }
  }

  renderNextStepPart() {
    let {updateHashStateByPath, testingFields} = this.props

    return (
      <div className="height100 relative bordert dashed">
        <Button
          className="vertical-center-of-relative mg3l width150"
          onClick={() => updateHashStateByPath('step', step => step - 1)}
        >上一步</Button>

        <Button
          className="center-of-relative width150"
          type="primary"
          disabled={testingFields.length <= 2}
          onClick={() => updateHashStateByPath('step', step => step + 1)}
        >下一步</Button>
      </div>
    )
  }

  onTrainingFieldRemove = ev => {
    let {updateHashStateByPath} = this.props
    let colName = ev.target.getAttribute('data-col-name')
    updateHashStateByPath('testingFields', prevFields => prevFields.filter(fi => fi !== colName))
  }

  render() {
    let {style, columnsTypeDict, testingFields, trainingFields, updateHashStateByPath} = this.props
    let orderedColumns = _.orderBy(_.keys(columnsTypeDict), colName => TypeSortOrder[columnsTypeDict[colName]])

    let testingFieldsSet = new Set(testingFields)
    let trainingFieldsSet = new Set(trainingFields)

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
              checked={testingFields.length === colCount}
              indeterminate={testingFields.length !== 0 && testingFields.length !== colCount}
              onChange={ev => {
                if (ev.target.checked) {
                  updateHashStateByPath('testingFields', () => orderedColumns)
                } else {
                  updateHashStateByPath('testingFields', () => orderedColumns.filter(colName => {
                    return trainingFieldsSet.has(colName)
                  }))
                }
              }}
            >全选</Checkbox>

            {orderedColumns.map((colName, idx) => {
              // 训练时候带有的字段，预测必须带有
              let disabled = trainingFieldsSet.has(colName)
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
                      updateHashStateByPath('testingFields', prevFields => [...prevFields, colName])
                    } else {
                      updateHashStateByPath('testingFields', prevFields => prevFields.filter(fi => fi !== colName))
                    }
                  }}
                  checked={testingFieldsSet.has(colName)}
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
            待预测字段
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

          <div className="bordert pd3l height60 line-height60">测试字段</div>

          <div
            className="bordert pd2t pd3l pd2r overscroll-y"
            style={{height: `calc(100% - ${40 + 60 * 2}px)`}}
          >
            {_.drop(testingFields, 2).map(tf => {
              return (
                <div
                  key={tf}
                  className="itblock width140 bg-ddd pd2l pd3r mg2b mg2r relative elli"
                >
                  {tf}
                  {trainingFieldsSet.has(tf) ? null : (
                    <CloseOutlined
                      className="pointer vertical-center-of-relative right0"
                      data-col-name={tf}
                      style={{marginRight: '10px'}}
                      onClick={this.onTrainingFieldRemove} />
                  )}
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
