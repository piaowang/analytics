/**
 * Created by heganjie on 2016/10/19.
 */

import React from 'react'
import { Icon as LegacyIcon } from '@ant-design/compatible'
import { CloseCircleOutlined, EditOutlined, HeartOutlined } from '@ant-design/icons'
import {Button, Tooltip, Popconfirm, Select, message, Popover, Input} from 'antd'
import Fetch from '../../common/fetch-final'
import {decompressUrlQuery, tryJsonParse} from '../../../common/sugo-utils'
import withAutoFocus from '../Common/auto-focus'
import PubSub from 'pubsub-js'
import _ from 'lodash'

const InputWithAutoFocus = withAutoFocus(Input)

const Option = Select.Option

function initMarkName() {
  return ''
}

export function buildSlice(projectCurrent, sliceName) {
  let analyticParams = tryJsonParse(decompressUrlQuery(location.hash.slice(1)))
  if (!analyticParams.filters) {
    message.error('url 不正确， 是不是您修改过url？试着刷新页面看看')
    throw new Error('url 不正确')
  }
  
  if (!projectCurrent) {
    return message.error('请选择项目')
  }
  let datasource_name = projectCurrent.datasource_name
  let druid_datasource_id = projectCurrent.datasource_id
  
  return {
    slice_name: sliceName,
    datasource_name,
    druid_datasource_id,
    child_project_id: projectCurrent.parent_id ? projectCurrent.id : null,
    params: {
      ..._.omit(analyticParams, ['slice_name', 'selectedDataSourceId'])
    }
  }
}


export default class Bookmark extends React.Component {

  state = {
    markName: initMarkName(),
    marks: [],
    currentMarkId: '',
    currentMarkName: '',
    editMarkName: '',
    loading: false
  }

  componentDidMount() {
    this.getMarks()
  }

  componentDidUpdate(prevProps) {
    if (this.props.selectedDataSourceId !== prevProps.selectedDataSourceId && this.state.currentMarkId) {
      this.onChangeMark('', {
        props: {
          currentMarkName: ''
        }
      })
    }
  }

  /** 加载已保存的书签 */
  async getMarks() {
    let dsId = this.props.selectedDataSourceId
    let marks = await Fetch.get('/app/analytic/get', {
      where: {
        queryParams: {
          druid_datasource_id: dsId,
          params: {
            openWith: null
          }
        }
      }
    })
    marks = marks.result.map(r => {
      r.queryParams = tryJsonParse(r.queryParams)
      return r
    })
    this.setState({
      marks
    })
  }

  onChangeMarkName = e => {
    this.setState({
      markName: e.target.value
    })
  }

  onChangeUpdateMarkName = e => {
    this.setState({
      currentMarkName: e.target.value
    })
  }

  onChangeMark = (currentMarkId, option) => {
    let {currentMarkName, queryParams} = option.props
    this.setState({
      currentMarkId,
      currentMarkName
    })
    if (currentMarkId) {
      this.props.setMark(queryParams)
    }
  }

  saveMark = async () => {
    PubSub.publish('analytic.onVisiblePopoverKeyChange', null)

    let {projectCurrent} = this.props
    let {markName, loading, marks} = this.state
    if (loading) return message.warn('保存中..., 请稍候', 5)
    if (!markName) return message.warn('请填写书签名称', 5)

    let slice = buildSlice(projectCurrent)

    let data = {
      name: markName,
      queryParams: slice
    }

    //save slice
    this.setState({ loading: true })
    let res = await Fetch.post('/app/analytic/create', data)
    if (!res) {
      this.setState({
        loading: false
      })
      return
    }
    let mark = res.result
    this.setState({
      loading: false,
      marks: [mark].concat(marks),
      currentMarkId: '' + mark.id,
      markName: initMarkName(),
      currentMarkName: mark.name
    })

    message.success(
      <div className="iblock">
        保存书签成功!
      </div>
      , 8)
  }

  onDelete = async () => {
    PubSub.publish('analytic.onVisiblePopoverKeyChange', null)

    let {currentMarkId, marks} = this.state
    let res = await Fetch.delete(`/app/analytic/delete/${currentMarkId}`)
    let marks1 = marks.filter(m => m.id !== currentMarkId)
    if (res) {
      message.success('删除成功!', 5)
      this.setState({
        marks: marks1,
        currentMarkId: '',
        currentMarkName: ''
      })
    }
  }

  updateMark = async () => {
    PubSub.publish('analytic.onVisiblePopoverKeyChange', null)

    let {projectCurrent} = this.props
    let {currentMarkId, currentMarkName, loading, marks} = this.state
    if (!currentMarkId) return
    if (loading) return message.warn('保存中..., 请稍候', 5)
    if (!currentMarkName) return message.warn('请填写书签名称', 5)

    let slice = buildSlice(projectCurrent)

    let data = {
      name: currentMarkName,
      queryParams: slice
    }

    //save slice
    this.setState({ loading: true })
    let res = await Fetch.put(`/app/analytic/update/${currentMarkId}`, data)
    if (!res) {
      this.setState({
        loading: false
      })
      return
    }
    let mark = {
      id: currentMarkId,
      ...slice,
      name: currentMarkName,
      queryParams: data.queryParams
    }
    let newMarks = marks.map(m => {
      return m.id === currentMarkId
        ? mark
        : m
    })
    this.setState({
      loading: false,
      marks: newMarks
    })

    message.success(
      <div className="iblock">
        更新书签成功!
      </div>
      , 8)

  }

  renderEditButton = () => {
    let { visiblePopoverKey } = this.props
    let { currentMarkName, loading, currentMarkId } = this.state

    let isBtnDisabled = loading || visiblePopoverKey === 'analyticSaveBookmark' || visiblePopoverKey === 'analyticEditBookmark'
    if (!currentMarkId) return ''

    let savePop = visiblePopoverKey === 'analyticEditBookmark' ? (
      <div className="pd1">
        <InputWithAutoFocus
          value={currentMarkName}
          className="iblock width160 mg1r"
          onChange={this.onChangeUpdateMarkName}
          onPressEnter={this.updateMark}
        />

        <Button
          icon={<LegacyIcon type={loading ? 'loading' : 'save'} />}
          type="primary"
          disabled={!currentMarkName}
          onClick={this.updateMark}
        >
          {loading ? '更新中...' : '更新'}
        </Button>
      </div>
    ) : null

    return (
      <Tooltip
        placement="bottomLeft"
        title={`编辑/更新【${currentMarkName}】书签`}
        visible={visiblePopoverKey === 'analyticEditBookmark-hint'}
        onVisibleChange={visible => {
          if (visible && isBtnDisabled) {
            return
          }
          PubSub.publish('analytic.onVisiblePopoverKeyChange', visible && 'analyticEditBookmark-hint')
        }}
      >
        <Popover
          title="更新书签"
          visible={visiblePopoverKey === 'analyticEditBookmark'}
          onVisibleChange={visible => {
            PubSub.publish('analytic.onVisiblePopoverKeyChange', visible && 'analyticEditBookmark')
          }}
          content={savePop}
          placement="topLeft"
          trigger="click"
        >
          <Button
            icon={<EditOutlined />}
            className="mg1r itblock"
            disabled={isBtnDisabled}
          />
        </Popover>
      </Tooltip>
    )
  }

  renderDelButton = () => {
    let { visiblePopoverKey } = this.props
    let { currentMarkName, loading, currentMarkId } = this.state

    let isBtnDisabled = loading || visiblePopoverKey === 'analyticSaveBookmark' || visiblePopoverKey === 'analyticEditBookmark'
    if (!currentMarkId) return ''
    
    return (
      <Popconfirm
        title={`确定要删除【${currentMarkName}】书签吗？`}
        onConfirm={this.onDelete}
        okText="确定"
        cancelText="取消"
        visible={visiblePopoverKey === 'analyticDeleteBookmark'}
        onVisibleChange={visible => {
          PubSub.publish('analytic.onVisiblePopoverKeyChange', visible && 'analyticDeleteBookmark')
        }}
      >
        <Tooltip
          placement="bottomLeft"
          title={`删除【${currentMarkName}】书签`}
          visible={visiblePopoverKey === 'analyticDeleteBookmark-hint'}
          onVisibleChange={visible => {
            if (visible && isBtnDisabled) {
              return
            }
            PubSub.publish('analytic.onVisiblePopoverKeyChange', visible && 'analyticDeleteBookmark-hint')
          }}
        >
          <Button
            icon={<CloseCircleOutlined />}
            className="mg1r itblock color-red"
            disabled={isBtnDisabled}
          />
        </Tooltip>
      </Popconfirm>
    )
  }

  filterMarks() {
    return this.state.marks.filter(m => m.queryParams.druid_datasource_id === this.props.selectedDataSourceId)
  }

  render() {
    let {visiblePopoverKey, className, style} = this.props
    let {markName, loading, currentMarkId} = this.state
    let isBtnDisabled = loading || visiblePopoverKey === 'analyticSaveBookmark' || visiblePopoverKey === 'analyticEditBookmark'

    let marks = this.filterMarks()
    let savePop = visiblePopoverKey === 'analyticSaveBookmark' ? (
      <div className="pd1">
        <InputWithAutoFocus
          value={markName}
          className="iblock width160 mg1r"
          onChange={this.onChangeMarkName}
          onPressEnter={this.saveMark}
        />

        <Button
          icon={<LegacyIcon type={loading ? 'loading' : 'save'} />}
          type="success"
          disabled={!markName}
          onClick={this.saveMark}
        >
          {loading ? '保存中...' : '保存'}
        </Button>
      </div>
    ) : null

    return (
      <div
        className={className}
        style={style}
      >
        <Select
          value={currentMarkId}
          showSearch
          disabled={isBtnDisabled}
          className="width120 mg1r itblock"
          onSelect={this.onChangeMark}
          notFoundContent="没有找到"
          optionFilterProp="children"
          dropdownMatchSelectWidth={false}
        >
          <Option key="no-mark" value="" currentMarkName="">选择书签</Option>
          {
            marks.map((m, i) => {
              return (
                <Option
                  key={`mark_${i}`}
                  value={'' + m.id}
                  currentMarkName={m.name}
                  queryParams={m.queryParams}
                >{m.name}</Option>
              )
            })
          }
        </Select>
        {this.renderEditButton()}
        {this.renderDelButton()}

        <Tooltip
          title="保存当前查询条件为书签"
          placement="bottomLeft"
          visible={visiblePopoverKey === 'analyticSaveBookmark-hint'}
          onVisibleChange={visible => {
            if (visible && isBtnDisabled) {
              return
            }
            PubSub.publish('analytic.onVisiblePopoverKeyChange', visible && 'analyticSaveBookmark-hint')
          }}
        >
          <Popover
            title="保存书签"
            visible={visiblePopoverKey === 'analyticSaveBookmark'}
            onVisibleChange={visible => {
              PubSub.publish('analytic.onVisiblePopoverKeyChange', visible && 'analyticSaveBookmark')
            }}
            content={savePop}
            placement="topLeft"
            trigger="click"
          >
            <Button
              icon={<HeartOutlined />}
              type="ghost"
              className="itblock"
              disabled={isBtnDisabled}
            >
              保存书签
            </Button>
          </Popover>
        </Tooltip>
      </div>
    )
  }


}
