import React from 'react'
import { AppstoreFilled, DeleteOutlined, EditOutlined, PlusCircleFilled } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Button, Input, Popconfirm, Popover } from 'antd';
import _ from 'lodash'
import { connect } from 'react-redux'
import { withCommonFilter } from '../../Common/common-filter'
import LivescreenModel, { namespace } from './model'
import withRuntimeSagaModel from '../../Common/runtime-saga-helper'
import classNames from 'classnames'
import smartSearch from '../../../../common/smart-search'
import { validateFields } from '../../../common/decorators'
import EditLiveScreenCategoryModal from './edit-modal'
/**
 * 实时大屏列表
 * 
 * @class MyLiveScreen
 * @extends {React.Component}
 */
const FormItem = Form.Item

@withRuntimeSagaModel(LivescreenModel)
@connect(props => {
  return {
    ...props[namespace]
  }
})
@Form.create()
@validateFields
export default class LiveScreenManager extends React.Component {

  changeState = payload => {
    this.props.dispatch({
      type: `${namespace}/changeState`,
      payload
    })
  }

  renderAddGroupBtn = () => {
    let { addCategoryModal, categoryName, form: { getFieldDecorator, } } = this.props
    return (
      <Popover
        title="添加分组"
        visible={addCategoryModal}
        onVisibleChange={visible => this.changeState({ addCategoryModal: visible })}
        content={
          <React.Fragment>
            <FormItem>
              {getFieldDecorator('showName', {
                initialValue: categoryName,
                rules: [{
                  required: true, message: '分组名称必填!'
                }, {
                  pattern: new RegExp("[^a-zA-Z0-9\_\u4e00-\u9fa5]", "i"),
                  message: '输入无效,包含非法字符',
                  validator: (rule, value, callback) => {
                    if (rule.pattern.test(value)) {
                      callback(rule.message)
                    }
                    callback()
                  }
                },{
                  pattern: '默认组',
                  message: '不能添加默认组',
                  validator: (rule, value, callback) => {
                    if (rule.pattern === value) {
                      callback(rule.message)
                    }
                    callback()
                  }
                }, {
                  max: 20,
                  message: '1~20个字符'
                }]
              })(
                <Input
                  key="input"
                  placeholder="请输入组名"
                  onChange={ev => this.changeState({ categoryName: ev.target.value })}
                />
              )}
            </FormItem>
            <div key="buttons" className="mg2t ant-popover-buttons">
              <Button
                size="small"
                onClick={() => this.changeState({ addCategoryModal: false })}
              >取消</Button>
              <Button
                type="primary"
                size="small"
                onClick={async () => {
                  const { setFields } = this.props.form
                  const val = await this.validateFields()
                  if (!val) return
                  this.props.dispatch({ type: `${namespace}/create`, payload: {}, callback: (msg) => msg && setFields({ showName: { value: val.showName, errors: [{  message: msg }] } }) })
                }}
              >确定</Button>
            </div>
          </React.Fragment>
        }
        trigger="click"
      >
        <PlusCircleFilled className="pointer font16" />
      </Popover>
    );
  }

  renderLivescreenCategoryList = withCommonFilter(commonFilter => {
    let { categoryList, selectedCategoryId, editInfo, showEditCategoryName, deleteCategoryModal,  hideOperation = false } = this.props
    let { keywordInput: SearchBox, searching } = commonFilter
    return (
      <React.Fragment>
        <div style={{ padding: '0 12px' }}>
          <div style={{ padding: '15px 0 16px' }} className="alignright">
            <span className="fleft pd2b">实时大屏分组</span>
            { hideOperation ? null : this.renderAddGroupBtn()}
          </div>
          <SearchBox placeholder="搜索..." />
        </div>

        <div style={{ marginTop: '10px' }}>
          {
            categoryList.filter(p => searching ? smartSearch(searching, p.title) : true).map(p => {
              return (
                <div
                  key={`category_${p.id}`}
                  className={classNames('usergroup-tag-list-item fpointer alignright hover-display-trigger', {
                    active: !selectedCategoryId ? !p.id : p.id === selectedCategoryId
                  })}
                  onClick={() => this.changeState({ 
                    selectedCategoryId: selectedCategoryId === p.id ? undefined : p.id
                  })}
                >
                  <span className="fleft">
                    <AppstoreFilled className="mg1r" />
                    {p.title}
                  </span>
                  {
                    hideOperation ? null : (
                      <EditOutlined
                        className={`mg2r ${deleteCategoryModal ? '' : 'hover-display-iblock'}`}
                        onClick={() => this.changeState({ showEditCategoryName: true, editInfo: p })} 
                      />
                    )
                  }
                  {hideOperation ? null : this.renderDelGroupBtn(p)}
                </div>
              )
            })
          }
          <div
            key={'default'}
            className={classNames('usergroup-tag-list-item fpointer alignright hover-display-trigger', {
              active: selectedCategoryId === ''
            })}
            onClick={() => this.changeState({ selectedCategoryId: selectedCategoryId === '' ? undefined : '' })}
          >
            <span className="fleft">
              <AppstoreFilled className="mg1r" />
              默认组
            </span>
          </div>
        </div>
        <EditLiveScreenCategoryModal
          hideModal={() => this.changeState({showEditCategoryName: false})}
          category= {editInfo}
          updateCategory={ (payload) => {
            this.props.dispatch({
              type: `${namespace}/update`,
              payload
            })
          }}
          visible={showEditCategoryName}
        />
      </React.Fragment>
    );
  })

  renderDelGroupBtn = (category) => {
    const { deleteCategoryModal, refreshData } = this.props
    return (
      <Popconfirm
        title={(
          <React.Fragment>
            <div>确认删除{category.name} ？</div>
            <div className="color-red">分组里面的大屏会移动到默认组</div>
          </React.Fragment>
        )}
        visible={category.id === deleteCategoryModal}
        onConfirm={async () => {
          this.props.dispatch({
            type: `${namespace}/delete`,
            payload: { id: category.id },
            cb: refreshData
          })
        }}
        onVisibleChange={visible => this.changeState({ deleteCategoryModal: visible ? category.id : '' })}
      >
        <DeleteOutlined
          className={deleteCategoryModal ? '' : 'hover-display-iblock'}
          onClick={() => this.changeState({ deleteCategoryModal: category.id })} />
      </Popconfirm>
    );
  }

  render() {
    return this.renderLivescreenCategoryList()
  }
}
