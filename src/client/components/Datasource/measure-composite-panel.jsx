import React from 'react'
import { Link } from 'react-router'
import { CloseCircleOutlined } from '@ant-design/icons';
import { Tooltip, Input, Popconfirm, Select } from 'antd';
import _ from 'lodash'
import Search from '../Common/search'

const Option = Select.Option

class MeasureCompositeModal extends React.Component {
  state = {
    search: ''
  }

  onChange = e => {
    this.setState({
      search: e.target.value
    })
  }

  onDragover = e => {
    e.preventDefault()
    e.stopPropagation()
  }

  onDrop = (e, index) => {
    let {measures, updateMeasure} = this.props
    let name = e.dataTransfer.getData('text')
    let addedMeasure = _.find(measures, measure => measure.name === name)
    updateMeasure('add_measure', {
      index: index,
      name: addedMeasure.title || addedMeasure.name,
      formula: addedMeasure.formula
    })
  }

  delete = (index) => {
    let {updateMeasure} = this.props
    updateMeasure('delete_measure', index)
  }

  onOperatorChange = (value) => {
    let {updateMeasure} = this.props
    updateMeasure('update_meaures_operator', value)
  }

  addMeasure = (measure) => {
    let {updateMeasure} = this.props
    let compositeItem = this.props.measure.params.composite.items
    let index = null
    if(_.isEmpty(compositeItem[0])) {
      index = 0
    } else if(_.isEmpty(compositeItem[1])){
      index = 1
    }
    if(index !== null) {
      updateMeasure('add_measure', {
        index: index,
        name: measure.title || measure.name,
        formula: measure.formula
      })
    }
  }

  render () {
    let {search} = this.state
    let {measures, arithmeticTextMap} = this.props
    let {composite} = this.props.measure.params
    let cls = 'elli block pointer pd2x'

    measures = search
      ? measures.filter(measure => {
        let name = measure.title || measure.name
        return name.includes(search)
      })
      : measures
    let compositeName0
    let compositeFormula0
    let compositeName1
    let compositeFormula1
    if (composite && composite.items) {
      if (composite.items[0]) {
        compositeName0 = composite.items[0].name
        compositeFormula0 = composite.items[0].formula
      }
      if (composite.items[1]) {
        compositeName1 = composite.items[1].name
        compositeFormula1 = composite.items[1].formula
      }
    }

    return (
      <div className="measure-list">
        <div className="left iblock">
          <div className="search-box pd2">
            <Search
              onChange={this.onChange}
              value={search}
              placeholder="搜索"
            />
          </div>
          <div className="measure-list-wrapper">
            {
              measures.length
                ? measures.map((measure) => {
                  let name = measure.title || measure.name
                  return (
                    <div key={measure.id} className="usergroup-unit"
                      draggable
                      onDragStart={ev => {
                        ev.dataTransfer.setData('text', `${measure.name}`)
                      }}
                      onClick={() => {
                        this.addMeasure(measure)
                      }}
                    >
                      <Tooltip placement="right" title={name}>     
                        <span className={cls} >
                          {name}
                        </span>
                      </Tooltip>
                    </div>
                  )
                })
                : <p className="ug-empty pd2 aligncenter">
                  还没有维度
                </p>
            }
          </div>
        </div>
        <div className="right iblock">
          <div onDragOver={e => this.onDragover(e)} onDrop={(e) => {
            this.onDrop(e, 0)
          }}
          >
            <Input type="text" autoComplete="off" value={compositeName0} className="width80 mg1r" disabled={!!true} />
            <Input type="text" autoComplete="off" value={compositeFormula0} className="width200" disabled={!!true} />
            <Popconfirm
              title={'确定删除指标么？'}
              placement="topLeft"
              onConfirm={() => {
                this.delete(0)
              }}
            >
              <Tooltip title="删除">
                <CloseCircleOutlined className="mg1l font16 color-grey pointer" />
              </Tooltip>
            </Popconfirm>
          </div>
          <div className="center">
            <Select
              dropdownMatchSelectWidth={false}
              className="iblock width100 mg1r"
              value={composite.operator}
              defaultValue={'count'}
              onChange={(value) => {
                this.onOperatorChange(value)
              }}
            >
              {
                (Object.keys(arithmeticTextMap)).map((type, i) => {
                  return (
                    <Option key={i + ''} value={type}>
                      {arithmeticTextMap[type]}
                    </Option>
                  )
                })
              }
            </Select>
          </div>
          <div onDragOver={e => this.onDragover(e)} onDrop={(e) => {
            this.onDrop(e, 1)
          }}
          >
            <Input type="text" autoComplete="off" value={compositeName1} className="width80 mg1r" disabled={!!true} />
            <Input type="text" autoComplete="off" value={compositeFormula1} className="width200" disabled={!!true} />
            <Popconfirm
              title={'确定删除指标条件么？'}
              placement="topLeft"
              onConfirm={() => {
                this.delete(1)
              }}
            >
              <Tooltip title="删除">
                <CloseCircleOutlined className="mg1l font16 color-grey pointer" />
              </Tooltip>
            </Popconfirm>
          </div>
        </div>
      </div>
    );

  }
}

export default MeasureCompositeModal
