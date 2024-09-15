import React from 'react'
import Store from './store'
import _ from 'lodash'
import TagValueList from './list'
import { PlusCircleOutlined } from '@ant-design/icons';
import { Button, Spin, message } from 'antd';
import Bread from '../Common/bread'
import AddTagEnhancePanel from './edit'
const {cdn} = window.sugo
const urlBase = `${cdn}/_bc/sugo-analytics-static/assets/images`
import { AccessDataType } from '../../../common/constants'

export default class TagValueEnhanceIndex extends React.Component {

  constructor(props, context) {
    super(props, context)
    this.store = new Store()
    this.store.subscribe(state => this.setState(state))
    this.state = this.store.getState()
  }

  componentWillMount() {
    const { datasourceCurrent, projectCurrent } = this.props
    if (datasourceCurrent.id && projectCurrent.id) {
      this.store.initViewListModel(projectCurrent, datasourceCurrent)
    }
  }

  componentDidMount() {
    this.initOnResize({})
  }

  componentWillReceiveProps(nextProps) {
    const { projectCurrent } = this.props
    if (nextProps.projectCurrent.id && projectCurrent.id !== nextProps.projectCurrent.id) {
      this.store.initViewListModel(nextProps.projectCurrent, nextProps.datasourceCurrent)
    }
  }

  renderMsg() {
    const msg = this.state.vm.message
    if (!_.isEmpty(msg)) {
      message[msg.type](msg.text)
    }
  }

  componentWillUnmount() {
    this.removeResizeEvt()
  }

  getTagChildren = (dimName) => {
    const { datasourceCurrent, projectCurrent } = this.props
    this.store.getTagChildren(dimName, projectCurrent, datasourceCurrent)
  }

  calculateWidth = (options) => {

    //slice width compute
    let { dom, margin, offset } = options
    let width = dom.clientWidth - offset
    let maxItem = Math.floor(width / 300)
    let extra = width - 300 * maxItem
    maxItem = extra >= margin * (maxItem - 1) ? maxItem : maxItem - 1
    let cardWidth = (width - margin * (maxItem - 1)) / maxItem

    //which slice should show
    this.store.changeState({
      cardWidth,
      maxItem
    })
  }

  onWindowResize = (options) => {
    this.calculateWidth(options)
  }

  initOnResize = ({
    dom = document.getElementById('main-content'),
    margin = 15,
    offset = 71
  }) => {
    let options = { dom, margin, offset }
    this.onWindowResizeRef = _.debounce(
      () => this.onWindowResize(options),
      30
    )
    window.addEventListener('resize', this.onWindowResizeRef)
    this.onWindowResize(options)
  }

  removeResizeEvt = () => {
    window.removeEventListener('resize', this.onWindowResizeRef)
    this.onWindowResizeRef.cancel()
  }

  onEdit = (model) => {
    const { datasourceCurrent, projectCurrent } = this.props
    this.store.editTagEnhance(model, projectCurrent, datasourceCurrent)
  }

  onSave = (newModel) => {
    const { model } = this.state.vm
    newModel = { ...model, ...newModel }
    const { projectCurrent } = this.props
    if (!model.project_id) newModel.project_id = projectCurrent.id
    this.store.save(newModel)
  }

  renderAddPanel = () => {
    const { addPanelVisible, selectTagChildren, dimensions, model, tagTypes, quering } = this.state.vm
    const { changeState } = this.store
    return (
      <AddTagEnhancePanel
        saveTagEnhance={this.onSave}
        changeState={changeState}
        addPanelVisible={addPanelVisible}
        getTagChildren={this.getTagChildren}
        dimensions={dimensions}
        selectTagChildren={selectTagChildren}
        model={model}
        tagTypes={tagTypes}
        quering={quering}
      />
    )
  }

  notok = () => {
    return (
      <div
        className="relative"
        style={{ height: 'calc(100vh - 200px)' }}
      >
        <div className="center-of-relative aligncenter">
          <p>
            <img src={`${urlBase}/ui-nothing.png`} alt="" className="iblock" />
          </p>
          <div className="pd2t">
            这个项目不是由标签系统创建的，不能使用用户画像，请切换到由标签系统创建的项目。
          </div>
        </div>
      </div>
    )
  }

  render() {
    const { projectCurrent } = this.props
    if (AccessDataType.Tag !== projectCurrent.access_type) {
      return this.notok()
    }
    this.renderMsg()
    const { modelList, cardWidth, dimensions, listLoading, addPanelVisible } = this.state.vm
    return (
      <div className="height-100">
        <Spin spinning={listLoading}>
          <Bread path={[{ name: '价值升档' }]} >
            <Button
              type="primary"
              onClick={this.store.showAddPanel}
            >
              <PlusCircleOutlined />
              新建分析
            </Button>
          </Bread>
          <TagValueList
            cardWidth={cardWidth}
            dimensions={dimensions}
            dataSource={modelList}
            changeState={this.store.changeState}
            deleteTagEnhance={this.store.deleteTagEnhance}
            editTagEnhance={this.onEdit}
            recalculateTagEnhance={this.store.recalculate}
          />
          {
            addPanelVisible ? this.renderAddPanel() : null
          }
        </Spin>
      </div>
    );
  }
}
