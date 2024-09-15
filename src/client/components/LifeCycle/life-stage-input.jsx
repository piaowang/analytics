/**
 * @author WuQic
 * @email chao.memo@gmail.com
 * @create date 2019-04-11 15:07:15
 * @modify date 2019-04-11 15:07:15
 * @description 生命周期-阶段组件
 */
import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { PlusOutlined } from '@ant-design/icons';
import { Input, Button, Tooltip, Drawer } from 'antd'
import Icon from '~/components/common/sugo-icon'
import { immutateUpdate } from 'common/sugo-utils'
import { defaultStages } from './store/constants'
import _ from 'lodash'
import { moveArrayPosition } from 'client/common/utils'
import UserGroupEditor from './user-group-editor'
import { connect } from 'react-redux'

@connect(state => ({
  ...state['lifeCycleForm'],
  ...state['common'],
  ...state['sagaCommon']
}))
export default class LifeStageInput extends PureComponent {

  static propTypes = {
    value: PropTypes.array,
    onChange: PropTypes.func
  }

  state = {
    visible: false,
    expandIdx: 0,
    editTitle: '人群条件'
  }

  changeProps(payload) {
    this.props.dispatch({type: 'lifeCycleForm/setState', payload})
  }

  addHandler = () => {
    const { value , onChange, stageState, datasourceCurrent, groupby } = this.props

    const { id, name } = datasourceCurrent
    let newStageState = _.cloneDeep(stageState)
    newStageState.push({
      id: '',
      druid_datasource_id: id,
      datasource_name: name,
      params: { composeInstruction: [] }
    })

    const length = _.size(defaultStages)
    const size = _.size(value)
    let nextVal = size < length ? defaultStages[size] : {
      key: size + '',
      stage: `阶段${size + 1}`,
      description: `说明${size + 1}`
    }

    this.changeProps({stageState: newStageState})
    onChange(
      immutateUpdate(value, size, () => nextVal)
    )
  }

  removeHandler = (item, idx) => {
    const { value , onChange, stageState } = this.props

    this.changeProps({stageState: stageState.filter( (i, idx0) => idx0 !== idx)})
    onChange(
      immutateUpdate(value, [], prev => prev.filter((r, idx0) => idx0 !== idx))
    )
  }

  sortHandler = (item, idx, type) => {
    const { value , onChange, stageState } = this.props
    const newValue = moveArrayPosition(value, item, idx, type)
    const newStage = moveArrayPosition(stageState, stageState[idx], idx, type)
    this.changeProps({stageState: newStage})
    onChange(
      immutateUpdate(value, [], () => newValue)
    )
  }

  editUserGroupHandler = (item, idx) => {
    const { value , onChange } = this.props
    this.setState({
      visible: true,
      expandIdx: idx,
      editTitle: `人群条件：阶段${+idx + 1} ${item.stage}`
    })
  }

  render() {
    const { editTitle, visible, expandIdx } = this.state
    const { value , onChange } = this.props
    return (
      <div>
        <div className="scroll-content always-display-scrollbar" style={{maxHeight: 550}}>
          {
            value.map((item, idx) => {
              return (
                <div key={`stage-item-${idx}`} className="m-sub-content mg2y">
                  <div className="mg1r bold color-blue inline">阶段{idx + 1}：</div>
                  <Input
                    className="width-15 mg2r"
                    value={item.stage}
                    onChange={e => onChange(
                      immutateUpdate(value, `[${idx}].stage`, () => e.target.value)
                    )}
                  />
                  <div className="mg1r inline">说明：</div>
                  <Input
                    className="width-45 mg1r"
                    value={item.description}
                    onChange={e => onChange(
                      immutateUpdate(value, `[${idx}].description`, () => e.target.value)
                    )}
                  />
                  <a className="mg1x" onClick={() => this.editUserGroupHandler(item, idx)}>编辑人群条件</a>
                  <div className="opt-btns hide">
                    {
                      idx > 0 ? (
                        <Tooltip title="上移">
                          <Icon type="arrow-up" onClick={() => this.sortHandler(item, idx, 'moveUp')} className="mg1r pointer font16"/>
                        </Tooltip>
                      ) : null
                    }
                    {
                      idx < value.length - 1 ? (
                        <Tooltip title="下移">
                          <Icon type="arrow-down" onClick={() => this.sortHandler(item, idx, 'moveDown')} className="mg1r pointer font16"/>
                        </Tooltip>
                      ) : null
                    }
                    { /** 最少2个阶段 */
                      idx > 1 ? (
                        <Tooltip title="删除">
                          <Icon type="sugo-delete" onClick={() => this.removeHandler(item, idx)} className="mg1r pointer font16"/>
                        </Tooltip>
                      ) : null
                    }
                  </div>
                </div>
              )
            })
          }
        </div>
        <div className="mg1y">
          <Button icon={<PlusOutlined />} type="dashed" className="width-20" onClick={this.addHandler}>新增阶段</Button>
        </div>
        <Drawer
          title={editTitle}
          width={1080}
          destroyOnClose
          onClose={() => this.setState({visible: false})}
          visible={visible}
        >
          <UserGroupEditor
            {...this.props}
            visible={visible}
            expandIdx={expandIdx}
            onClose={() => this.setState({visible: false})}
            onSave={() => {}}
          />
        </Drawer>
      </div>
    );
  }
}
