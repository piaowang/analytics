import React from 'react'
import Bread from '../Common/bread'
import { CloseOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import {
  Button,
  Checkbox,
  Input,
  InputNumber,
  message,
  notification,
  Radio,
  Select,
  Tooltip,
  DatePicker,
} from 'antd';
import _ from 'lodash'
import {getUsers, getBusinessDimension} from '../../actions'
import {connect} from 'react-redux'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import {validateFieldsAndScrollByForm} from '../../common/decorators'
import {browserHistory} from 'react-router'
import {
  dataSourceListSagaModelGenerator,
  globalConfigSagaModelGenerator,
  indicesSagaModelGenerator,
  tableListSagaModelGenerator,
  tagSagaModelGenerator
} from './saga-model-generators'
import {GlobalConfigKeyEnum, OfflineCalcIndicesTypeEnum, TagTypeEnum, indicesDataFormat, indicesGenerationCycle, indicesStatisticalType} from '../../../common/constants'
import {dictBy, immutateUpdate} from '../../../common/sugo-utils'
import FormulaEditor, {getArgsFromWidgetInfo} from './formula-editor'
import PublicSelfDimEditor from './public-self-dim-editor'
import CreateIndexInFormulaEditorModal from './create-index-in-formula-editor-modal'
import PickIndexInFormulaEditorModal from './pick-index-in-formula-editor-modal'
import {statisticsTypeTextMap} from '../../common/constans'
import {parse} from './formula-parser'
import CryptoJS from 'crypto-js'
import moment from 'moment'
import LifeCycleEditor from './life-cycle-editor'
import translateFormula, { findAllTableName } from './formula-translator'
import DepartmentPicker from '../Departments/department-picker'
import PickDimensionInFormulaEditorModal from './pick-dimension-in-formula-editor-modal'
import {genIndicesId} from '../../common/offline-calc-helper'
import {guessSimpleTypeByDbDataType} from '../../../common/offline-calc-model-helper'
import PublicDimEditor from './public-dim-editor-modal'
import SelfDimEditor from './self-dim-editor-modal'

import businessLineManagement, {namespace as businessLineManagementNamespace }  from './business-line-management-model'

const namespace = 'offline-calc-indices-edit'

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 16 }
}

const {Option} = Select

let mapStateToProps = (state, ownProps) => {
  const editingIndexObj = state[namespace] || {}
  const indicesSyncState = state['pick-offline-calc-indices-in-formula-editor'] || {}
  const tableSyncState = state['offline-calc-tables-for-dim-picker'] || {}
  const dsSyncState = state['offline-calc-data-sources-for-dim-picker'] || {}
  const tagSyncState = state[`tags-for-index-edit_${TagTypeEnum.offline_calc_index}`] || {}
  const globalConfigSyncState = state['indices-units-picker'] || {}
  const businessDimension = state.common.businessDimension
  return {
    ...editingIndexObj,
    businessDimension,
    businessDimensionIdDict: _.keyBy(businessDimension.list, o => o.id),
    offlineCalcDataSources: dsSyncState.offlineCalcDataSources,
    offlineCalcTables: tableSyncState.offlineCalcTables,
    indicesIdDict: dictBy(indicesSyncState.offlineCalcIndices, o => o.id),
    dimIdNameDict: {},
    indicesValidUnits: (_.get(globalConfigSyncState, 'globalConfigs[0].value') || '').split('|').filter(_.identity),
    tags: tagSyncState.tags,
    users: _.get(state, 'common.users', []),
    businessLineManagement: _.get(state, [businessLineManagementNamespace, 'dataSource'], [])
  }
}


@connect(mapStateToProps)
@withRuntimeSagaModel([
  indicesSagaModelGenerator(namespace, 'single'),
  tagSagaModelGenerator('tags-for-index-edit', TagTypeEnum.offline_calc_index),
  globalConfigSagaModelGenerator('indices-units-picker', GlobalConfigKeyEnum.OfflineCalcIndicesUnit),
  dataSourceListSagaModelGenerator('offline-calc-data-sources-for-dim-picker'),
  tableListSagaModelGenerator('offline-calc-tables-for-dim-picker'),
  businessLineManagement
])
@Form.create()
export default class OfflineCalcIndicesEdit extends React.Component {
  state = {
    visiblePopoverKey: ''
  }
  
  componentDidMount() {

    this.props.dispatch(getBusinessDimension({pageSize: 9999}))
    this.props.dispatch(getUsers())
    this.props.dispatch({type: `${businessLineManagementNamespace}/list`, callback: ()=>{}})
  }
  
  /*componentDidUpdate(prevProps, prevState, snapshot) {
    if (isDiffByPath(this.props, prevProps, 'offlineCalcDimensionsBak')) {
      this.props.form.resetFields()
    }
  }*/

  parseFormula(idxObj) {
    let { dimIdNameDict, indicesIdDict, offlineCalcDataSources, offlineCalcTables } = this.props
    let widgets = this._formulaEditor.state.widgets
    // useIdx({idxId: 'dimId'}) 使用现有指标
    // createIdx({dim: {func: 'useDim', args: [{dimId: 'xxx'}]}, aggregator: 'count'}) 创建指标
  
    return immutateUpdate(idxObj, 'formula_info', formulaInfo => {
      const dimInfoDepForIdxs = _(widgets)
        .filter(w => w.widgetName === 'createIdx')
        .flatMap(w => {
          const args = getArgsFromWidgetInfo(w)
          const dim = _.get(args, [0, 'dim'])
          const dimInFilters = (_.get(args, [0, 'filters']) || []).map(f => f.dim)
          return [dim, ...dimInFilters]
        })
        .map(dim => _.get(dim, ['args', 0]))
        .compact()
        .value()
  
      const dimInfoDepForDims = widgets
        .filter(w => w.widgetName === 'importDim')
        .map(w => {
          const args = getArgsFromWidgetInfo(w)
          return  _.get(args, [0])
        })
        .filter(_.identity)
      
      const dimInfoDeps = [...dimInfoDepForIdxs, ...dimInfoDepForDims]
      
      const dimDeps = _(dimInfoDeps)
        .map(dimInfo => {
          const {dsId, dimId, tableName, fieldName} = dimInfo
          return dimId ? dimId : `${dsId}|${tableName}|${fieldName}`
        })
        .uniq()
        .value()
      const idxDeps = widgets
        .filter(w => w.widgetName === 'useIdx')
        .map(w => {
          let args = getArgsFromWidgetInfo(w)
          return _.get(args, [0, 'idxId'])
        })
        .filter(_.identity)
      
      const tableDeps = _(dimInfoDeps)
        .map(dimInfo => {
          const {dsId, tableName} = dimInfo
          let table = _.find(offlineCalcTables, t => t.data_source_id === dsId && t.name === tableName)
          return table && table.id
        })
        .compact()
        .uniq()
        .value()
  
      let ast
      try {
        ast = parse(formulaInfo.text)
      } catch (e) {
        notification.warn({
          message: '解析公式出错，无法保存',
          key: CryptoJS.MD5('解析公式出错，无法保存').toString(),
          description: (
            <div className="mw300 common-err-msg animate wordbreak" >{e.message}</div>
          ),
          duration: 20
        })
    
        throw e
      }
      let uiText = translateFormula(ast, { dimIdNameDict, indicesIdDict, offlineCalcDataSources })
      return {
        ...formulaInfo,
        // [dimId, dsId|tableName|fieldName]
        dimDeps: dimDeps,
        // [idxId]
        idxDeps: idxDeps,
        // [tableId]
        tableDeps: tableDeps,
        ast: ast,
        uiText,
        isCalcDim: this.isCalcDim()
      }
    })
  }
  
  onSubmit = async ev => {
    let {offlineCalcIndices, dispatch, form, params} = this.props
    ev.preventDefault()
    let formVals = await validateFieldsAndScrollByForm(form, null, {force: true})
    if (!formVals) {
      return
    }
    // 生成依赖项，生成抽象语法树
    formVals = this.parseFormula(formVals)
    formVals.start_time= moment(formVals.start_time).clone().set({hour: 0, minute: 0, second: 0, millisecond: 0})
    formVals.end_time= moment(formVals.end_time).clone().set({hour: 23, minute: 59, second: 59, millisecond: 0})
    const currIdInUrl = _.get(params, 'id')
    const isCreating = currIdInUrl === 'new'
    let nextIndices = isCreating
      ? [formVals]
      : offlineCalcIndices.map(obj => obj.id === currIdInUrl ? {...obj, ...formVals} : obj) 
    await dispatch({
      type: `${namespace}/sync`,
      payload: nextIndices,
      callback: syncRes => {
        let {resCreate, resUpdate} = syncRes || {}
        if (_.isEmpty(resCreate) && _.isEmpty(resUpdate)) {
          message.warn('没有修改数据，无须保存')
          return
        }
        if (_.isEmpty(_.compact(resCreate)) && _.isEmpty(_.compact(resUpdate))) {
          // 保存报错
          return
        }
        const isCreated = _.isEmpty(resUpdate)
        if (resCreate && resCreate[0] && resCreate[0].result && resCreate[0].result.sucess === false) {
          message.error('保存失败，指标编号已经存在')
          return
        }
        message.success((
          <span>{isCreated ? '创建' : '修改'}指标成功</span>
        ))
        if (isCreated) {
          let createdId = _.get(resCreate, [0, 'result', 'id'])
          browserHistory.push(`/console/offline-calc/indices/${createdId}`)
          dispatch({ type: `${namespace}/fetch`, payload: createdId})
        }
        
        // 编辑了公有版本，切换到私有版本
        if (!_.isEmpty(resUpdate)) {
          let updatedAPIId = _.get(resUpdate, [0, 'result', 'id'])
          if (updatedAPIId) browserHistory.push(`/console/offline-calc/indices/${updatedAPIId}`)
        }
      }
    })
  }
  
  renderCreateIndexInFormulaEditorModal = () => {
    let {visiblePopoverKey} = this.state
    let value = null, widget
    if (_.startsWith(visiblePopoverKey, 'createIndexInFormula:')) {
      widget = this._formulaEditor.state.widgets[visiblePopoverKey.split(/[:|]/)[1]]
      value = {
        func: widget.widgetName,
        args: getArgsFromWidgetInfo(widget)
      }
    }
    return (
      <CreateIndexInFormulaEditorModal
        reuseSagaModel={this.props.reuseSagaModel}
        title="创建基础指标"
        value={value || {}}
        visiblePopoverKey={visiblePopoverKey}
        onVisiblePopoverKeyChange={next => {
          this.setState({
            visiblePopoverKey: next
          })
        }}
        onOk={nextValue => {
          if (!nextValue) {
            return
          }
          const {func, args} = nextValue
          const preInsert = `${func}(${args.map(v => JSON.stringify(v)).join(', ')})`
          const { getFieldValue, setFieldsValue } = this.props.form
          let currFormula = getFieldValue('formula_info.text')
          if (widget) {
            setFieldsValue({
              'formula_info.text': currFormula.replace(widget.text, (m, offset) => {
                // 只修改目标维度
                return offset === widget.startAt ? preInsert : m
              })
            })
          } else {
            this._formulaEditor.insertText(preInsert)
          }
          this.setState({ visiblePopoverKey: '' })
        }}
      />
    )
  }
  
  renderUseIndexInFormulaEditorModal = () => {
    let {visiblePopoverKey} = this.state
    let value = null, widget
    if (_.startsWith(visiblePopoverKey, 'useIndexInFormula:')) {
      widget = this._formulaEditor.state.widgets[visiblePopoverKey.split(':')[1]]
      value = {
        func: widget.widgetName,
        args: getArgsFromWidgetInfo(widget)
      }
    }
    const currIdInUrl = _.get(this.props.params, 'id')
    const isCalcDim = this.isCalcDim()
    return (
      <PickIndexInFormulaEditorModal
        reuseSagaModel={this.props.reuseSagaModel}
        title="添加现有指标"
        value={value || {}}
        indexFilter={d => {
          if (d.id === currIdInUrl) {
            return false
          }
          if (_.isNil(isCalcDim)) {
            return true
          }
          if (isCalcDim) {
            return d.formula_info.isCalcDim === true
          } else {
            return !d.formula_info.isCalcDim
          }
        }}
        visible={_.startsWith(visiblePopoverKey, 'useIndexInFormula')}
        onCancel={() => {
          this.setState({ visiblePopoverKey: '' })
        }}
        onOk={nextValue => {
          if (!nextValue) {
            return
          }
          const {func, args} = nextValue
          const preInsert = `${func}(${args.map(v => JSON.stringify(v)).join(', ')})`
          if (widget) {
            const { getFieldValue, setFieldsValue } = this.props.form
            let currFormula = getFieldValue('formula_info.text')
            setFieldsValue({
              'formula_info.text': currFormula.replace(widget.text, (m, offset) => {
                // 只修改目标维度
                return offset === widget.startAt ? preInsert : m
              })
            })
          } else {
            this._formulaEditor.insertText(preInsert)
          }
          this.setState({ visiblePopoverKey: '' })
        }}
      />
    )
  }

  renderSelfDimensionEditModal = 
  (tablesSet) => {
    let {visiblePopoverKey} = this.state
    const { businessDimension, offlineCalcDataSources, dimIdNameDict, indicesIdDict } = this.props
    const { getFieldValue } = this.props.form
    let value = null
    if (_.startsWith(visiblePopoverKey, 'selfDimEditor:')) {
      const currSelfDim = getFieldValue('params.selfDim')
      const index = visiblePopoverKey.replace('selfDimEditor:', '')
      value = currSelfDim[Number(index)]
    }
    return (
      <SelfDimEditor
        reuseSagaModel={this.props.reuseSagaModel}
        title="设置私有维度"
        value={value || {}}
        businessDimension={_.get(businessDimension,'list', [])}
        tablesSet={tablesSet}
        visiblePopoverKey={visiblePopoverKey}
        onVisiblePopoverKeyChange={next => {
          this.setState({
            visiblePopoverKey: next
          })
        }}
        onOk={nextValue => {
          if (!nextValue) {
            return
          }
          // const preInsert = `${func}(${args.map(v => JSON.stringify(v)).join(', ')})`
          const { getFieldValue, setFieldsValue } = this.props.form
          let selfDim = _.cloneDeep(getFieldValue('params.selfDim'))
          let args = _.get(nextValue, 'args' , [])
          args = args.filter( i => i.split('/').length === 3)
          if (_.isEmpty(args)) return message.error('至少选一个')
          nextValue.args = args

          let duplicateId = ''
          let index = 0
          if (selfDim.some( (i, idx) => {
            if (i.selfDimId === nextValue.selfDimId) {
              duplicateId = i.selfDimId
              index = idx
              return true
            }
          })) {
            let duplicate = _.find(_.get(businessDimension,'list', []), b => b.id === duplicateId)
            let duplicateName = duplicate.alias || duplicate.name || ''
            selfDim.splice(index, 1)
            message.success(`已更新维度:${duplicateName}`)
          }
          selfDim.push(nextValue)
          setFieldsValue({
            'params.selfDim': selfDim
          })
          this.setState({ visiblePopoverKey: '' })
        }}
      />
    )
  }

  renderPublicDimensionEditModal = 
  (tablesSet) => {
    let {visiblePopoverKey} = this.state
    const { businessDimension, offlineCalcDataSources, dimIdNameDict, indicesIdDict } = this.props
    const { getFieldValue } = this.props.form
    let value = null
    if (_.startsWith(visiblePopoverKey, 'publicDimEditor:')) {
      const currPublicDim = getFieldValue('params.publicDim')
      const index = visiblePopoverKey.replace('publicDimEditor:', '')
      value = currPublicDim[Number(index)]
    }
    return (
      <PublicDimEditor
        reuseSagaModel={this.props.reuseSagaModel}
        title="设置公有维度"
        value={value || {}}
        businessDimension={_.get(businessDimension,'list', [])}
        tablesSet={tablesSet}
        visiblePopoverKey={visiblePopoverKey}
        onVisiblePopoverKeyChange={next => {
          this.setState({
            visiblePopoverKey: next
          })
        }}
        onOk={nextValue => {
          if (!nextValue) {
            return
          }
          let args = _.get(nextValue, 'args' , [])
          if (args.some( i => i.split('/').length !== 3)) return message.error('所有维度都必须选字段')
          // const preInsert = `${func}(${args.map(v => JSON.stringify(v)).join(', ')})`
          const { getFieldValue, setFieldsValue } = this.props.form
          let publicDim = _.cloneDeep(getFieldValue('params.publicDim'))
          let duplicateId = ''
          let index = 0
          if (publicDim.some( (i, idx) => {
            if (i.publicDimId === nextValue.publicDimId) {
              duplicateId = i.publicDimId
              index = idx
              return true
            }
          })) {
            let duplicate = _.find(_.get(businessDimension,'list', []), b => b.id === duplicateId)
            let duplicateName = duplicate.alias || duplicate.name || ''
            publicDim.splice(index, 1)
            message.success(`已更新维度:${duplicateName}`)
          }
          publicDim.push(nextValue)
          setFieldsValue({
            'params.publicDim': publicDim
          })
          this.setState({ visiblePopoverKey: '' })
        }}
      />
    )
  }

  renderDimensionInFormulaEditModal = () => {
    let {visiblePopoverKey} = this.state
    
    let value = null, widget
    if (_.startsWith(visiblePopoverKey, 'editDimensionInFormula:')) {
      widget = this._formulaEditor.state.widgets[visiblePopoverKey.split(/[:|]/)[1]]
        [visiblePopoverKey.split(/[:|]/)[1]]
      value = {
        func: widget.widgetName,
        args: getArgsFromWidgetInfo(widget)
      }
    }
    return (
      <PickDimensionInFormulaEditorModal
        reuseSagaModel={this.props.reuseSagaModel}
        fieldFilter={f => guessSimpleTypeByDbDataType(f.type) === 'NUMBER'}
        title="添加维度"
        value={value || {}}
        visible={_.startsWith(visiblePopoverKey, 'editDimensionInFormula')}
        onCancel={() => {
          this.setState({ visiblePopoverKey: '' })
        }}
        onOk={nextValue => {
          if (!nextValue) {
            return
          }
          const {func, args} = nextValue
          const preInsert = `${func}(${args.map(v => JSON.stringify(v)).join(', ')})`
          if (widget) {
            const { getFieldValue, setFieldsValue } = this.props.form
            let currFormula = getFieldValue('formula_info.text')
            setFieldsValue({
              'formula_info.text': currFormula.replace(widget.text, (m, offset) => {
                // 只修改目标维度
                return offset === widget.startAt ? preInsert : m
              })
            })
          } else {
            this._formulaEditor.insertText(preInsert)
          }
          this.setState({ visiblePopoverKey: '' })
        }}
      />
    )
  }
  
  // 判断当前的指标公式是否是非聚合指标
  isCalcDim = () => {
    let widgets = _.get(this._formulaEditor, 'state.widgets') || []
    const {indicesIdDict} = this.props
    if (_.isEmpty(widgets)) {
      return undefined
    }
    return _.some(widgets, w => {
      if (w.widgetName === 'importDim') {
        return true
      }
      if (w.widgetName === 'useIdx') {
        let idxId = _.get(getArgsFromWidgetInfo(w), [0, 'idxId'])
        return _.get(indicesIdDict, [idxId, 'formula_info', 'isCalcDim'])
      }
      return false
    })
  }
  
  render() {
    let {
      users, params, offlineCalcIndices, offlineCalcDataSources, tags, indicesIdDict, dimIdNameDict, indicesValidUnits,
      onlyRenderItem = false, curr, offlineCalcTables, businessLineManagement=[], businessDimensionIdDict
    } = this.props
    const { getFieldDecorator, getFieldValue, setFieldsValue } = this.props.form
    let currIdx = _.get(offlineCalcIndices, [0])
    if (onlyRenderItem) currIdx = curr

    const isCreating = _.get(params, 'id') === 'new'

    let currFormula = getFieldValue('formula_info.text') || 'useIdx({})'
    let ast = ''
    try {
      ast = parse(currFormula)
    } catch(e) {
      ast = ''
    }
    let tablesSet = findAllTableName(ast, { dimIdNameDict, indicesIdDict, offlineCalcDataSources, offlineCalcTables, parse }, [], new Set())
    
    const itemComponent = (
      <React.Fragment>
        <Form.Item label="英文名称" {...formItemLayout}>
          {getFieldDecorator('name', {
            initialValue: _.get(currIdx, 'name'),
            rules: [
              { required: true, message: '未输入指标英文名', whitespace: true },
              { max: 32, message: '名称太长' },
              { pattern: /^[a-z_]\w+$/i, message: '只能输入英文字母、下划线和数字，首字符不能为数字' }
            ]
          })(<Input disabled={onlyRenderItem}/>)}
        </Form.Item>
        
        <Form.Item label="别名" {...formItemLayout}>
          {getFieldDecorator('title', {
            initialValue: _.get(currIdx, 'title'),
            rules: [
              { max: 32, message: '名称太长' },
              { required: false, message: '不能只有空格', whitespace: true }
            ]
          })(<Input disabled={onlyRenderItem}/>)}
        </Form.Item>
        
        <Form.Item
          label="所属数据源"
          {...formItemLayout}
        >
          {getFieldDecorator('data_source_id', {
            initialValue: _.get(currIdx, 'data_source_id'),
            rules: [
            ]
          })(
            <Select
              allowClear
              {...enableSelectSearch}
              placeholder="跨数据源"
              disabled={onlyRenderItem}
            >
              {(offlineCalcDataSources || []).map(ds => {
                return (
                  <Option key={ds.id} value={ds.id}>{ds.name}</Option>
                )
              })}
            </Select>
          )}
        </Form.Item>

        <Form.Item
          label="指标类型"
          {...formItemLayout}
        >
          {getFieldDecorator('params.composeType', {
            initialValue: _.get(currIdx, 'params.composeType') || 'BasicIndicator',
            rules: [
              {
                validator(type, value, callback) {
                  // 基础指标只能依赖单个维度，否则不属于基础指标
                  if (getFieldValue('params.composeType') !== 'BasicIndicator') {
                    callback([])
                    return
                  }
                  let currFormula = getFieldValue('formula_info.text') || ''
                  let calls = currFormula.match(/(createIdx|useIdx)\(/g)
                  if (0 < _.size(calls) && !_.isEqual(calls, ['createIdx('])) {
                    callback([
                      new Error('计算公式并非依赖单个维度，所以不能保存为基础指标类型')
                    ])
                    return
                  }
                  callback([])
                }
              }
            ]
          })(
            <Radio.Group disabled={onlyRenderItem} buttonStyle="solid" >
              {Object.keys(OfflineCalcIndicesTypeEnum).map(k => {
                const translate = OfflineCalcIndicesTypeEnum[k]
                return (
                  <Radio.Button
                    key={k}
                    value={k}
                    disabled={k === 'ImportedIndicator'}
                  >
                    {k === 'ImportedIndicator'
                      ? (
                        <span title="导入的指标才能使用此类型">{translate}</span>
                      )
                      : translate}
                  </Radio.Button>
                )
              })}
            </Radio.Group>
          )}
        </Form.Item>
        
        <Form.Item
          label="计算公式"
          {...formItemLayout}
        >
          {getFieldDecorator('formula_info.text', {
            initialValue: _.get(currIdx, 'formula_info.text'),
            rules: [
              { required: true, message: '必填项', whitespace: true }
            ]
          })(
            <FormulaEditor
              disabled={onlyRenderItem}
              ref={ref => this._formulaEditor = ref}
              className="offline-dimension-formula-editor corner border line-height24"
              initPublicSelfDim={() => {
                setFieldsValue({
                  'params.publicDim': [],
                  'params.selfDim': []
                })
              }}
              inlineWidgetOpts={{
                // useIdx({idxId: 'dimId'}) 使用现有指标
                // createIdx({dim: {func: 'importDim', args: [{dsId, tableName, fieldName}]}, aggregator: 'count'}) 创建指标
                // importDim({dsId: '', tableName: '', fieldName: ''}) 导入维度
                useIdx: {
                  regex: /useIdx\([^)]+\)/,
                  indicesIdDict,
                  render: ({idxId, filters}, pos) => {
                    const idxObj = _.get(indicesIdDict, idxId)
                    return (
                      <div
                        className="corner border iblock pd1x fpointer"
                        title={`现有指标：${idxObj ? idxObj.title || idxObj.name : '(指标已删除)'}`}
                        onClick={() => {
                          this.setState({
                            visiblePopoverKey: `useIndexInFormula:${pos}`
                          })
                        }}
                      >{idxObj ? idxObj.title || idxObj.name : '（指标已删除）'}</div>
                    )
                  }
                },
                createIdx: {
                  regex: /createIdx\([^)]+\)/,
                  dimIdNameDict, // 只是为了触发界面重新渲染
                  render: ({dim, aggregator, filters}, pos) => {
                    let {dsId, tableName, fieldName} = _.get(dim, ['args', 0], {})
                    
                    let ds = _.find(offlineCalcDataSources, ds => ds.id === dsId)
                    let table = _.find(offlineCalcTables, t => t.data_source_id === dsId && t.name === tableName)
                    let dimName = `${ds ? (ds.title || ds.name) + '/' : ''}${table ? (table.title || table.name) + '/' : ''}${fieldName}`
                    
                    return (
                      <div
                        className="corner border iblock pd1x fpointer"
                        title={`基础指标：${dimName} 的 ${statisticsTypeTextMap[aggregator]}`}
                        onClick={() => {
                          this.setState({
                            visiblePopoverKey: `createIndexInFormula:${pos}`
                          })
                        }}
                      >{fieldName ? `${fieldName} 的 ${statisticsTypeTextMap[aggregator]}` : '（维度已删除）'}</div>
                    )
                  }
                },
                importDim: {
                  regex: /importDim\([^)]+\)/,
                  render: ({dsId, tableName, fieldName}, pos) => {
                    let ds = _.find(offlineCalcDataSources, ds => ds.id === dsId)
                    let table = _.find(offlineCalcTables, t => t.data_source_id === dsId && t.name === tableName)
                    return (
                      <div
                        className="corner border iblock pd1x fpointer"
                        title={`维度：${ds ? (ds.title || ds.name) + '/' : ''}${table ? (table.title || table.name) + '/' : ''}${fieldName}`}
                        onClick={() => {
                          this.setState({
                            visiblePopoverKey: `editDimensionInFormula:${pos}`
                          })
                        }}
                      >{fieldName}</div>
                    )
                  }
                }
              }}
            />
          )}
          
          <Button
            size="small"
            onClick={() => {
              this.setState({
                visiblePopoverKey: 'createIndexInFormula'
              })
            }}
            title={this.isCalcDim() === true ? '聚合型指标不能与非聚合型混用' : undefined}
            disabled={onlyRenderItem || this.isCalcDim() === true}
          >插入基础指标</Button>
          
          {getFieldValue('params.composeType') === 'BasicIndicator' ? null : (
            <Button
              size="small"
              className="mg2l"
              onClick={() => {
                this.setState({
                  visiblePopoverKey: 'useIndexInFormula'
                })
              }}
              disabled={onlyRenderItem}
            >插入现有指标</Button>
          )}
  
          {getFieldValue('params.composeType') === 'BasicIndicator' ? null : (
            <Button
              size="small"
              className="mg2l"
              title={this.isCalcDim() === false ? '聚合型指标不能与非聚合型混用' : undefined}
              onClick={() => {
                this.setState({
                  visiblePopoverKey: 'editDimensionInFormula'
                })
              }}
              disabled={onlyRenderItem || this.isCalcDim() === false}
            >插入维度</Button>
          )}
          
          {this.renderCreateIndexInFormulaEditorModal()}
          {this.renderUseIndexInFormulaEditorModal()}
          {this.renderDimensionInFormulaEditModal()}
        </Form.Item>

        <Form.Item
          label="公有维度"
          {...formItemLayout}
        >
          {getFieldDecorator('params.publicDim', {
            initialValue: _.get(currIdx, 'params.publicDim', []),
            rules: [
              { required: tablesSet.length >= 1, message: '必填项' }
            ]
          })(
            <PublicSelfDimEditor
              // disabled={true}
              className="offline-dimension-formula-editor corner border line-height24"
              inlineWidgetOpts={(i, index) => {
                const { publicDimId } = i
                let target = businessDimensionIdDict[publicDimId] || {}
                let name = target.alias || target.name || '(维度已删除)'
                return (
                  <div
                    key={index + 'publicDim'}
                    className="corner border iblock mg1x"
                    style={{
                      height: '30px',
                      lineHeight: '30px'
                    }}
                  >
                    <span 
                      className="mg2x fpointer color-blue"
                      onClick={() => {
                        this.setState({
                          visiblePopoverKey: `publicDimEditor:${index}`
                        })
                      }}
                    >{name}</span>
                    <CloseOutlined
                      className='mg1r fpointer'
                      onClick={() => {
                        let curr = _.cloneDeep(getFieldValue('params.publicDim'))
                        curr.splice(index, 1)
                        setFieldsValue({
                          'params.publicDim': curr
                        })
                      }} />
                  </div>
                );
              }}
            />
          )}
          <Button
            size="small"
            onClick={() => {
              this.setState({
                visiblePopoverKey: 'publicDimEditor'
              })
            }}
            disabled={onlyRenderItem}
          >选择维度</Button>
          <Button
            className="mg2l"
            onClick={() => {
              setFieldsValue({
                'params.publicDim': []
              })
            }}
            disabled={onlyRenderItem}
          >清空</Button>
          {this.renderPublicDimensionEditModal(tablesSet)}
        </Form.Item>

        <Form.Item
          label="私有维度"
          {...formItemLayout}
        >
          {getFieldDecorator('params.selfDim', {
            initialValue: _.get(currIdx, 'params.selfDim', []),
            rules: [
              { required: tablesSet.length >= 1, message: '必填项' }
            ]
          })(
            <PublicSelfDimEditor
              // disabled={true}
              className="offline-dimension-formula-editor corner border line-height24"
              inlineWidgetOpts={(i, index) => {
                const { selfDimId } = i
                let target = businessDimensionIdDict[selfDimId] || {}
                let name = target.alias || target.name || '(维度已删除)'
                return (
                  <div
                    key={index + 'selfDim'}
                    style={{
                      height: '30px',
                      lineHeight: '30px'
                    }}
                    className="corner border iblock mg1x fpointer"
                  >
                    <span 
                      className="mg2x fpointer color-blue"
                      onClick={() => {
                        this.setState({
                          visiblePopoverKey: `selfDimEditor:${index}`
                        })
                      }}
                    >{name}</span>
                    <CloseOutlined
                      className='mg1r fpointer'
                      onClick={() => {
                        let curr = _.cloneDeep(getFieldValue('params.selfDim'))
                        curr.splice(index, 1)
                        setFieldsValue({
                          'params.selfDim': curr
                        })
                      }} />
                  </div>
                );
              }}
            />
          )}
          <Button
            size="small"
            onClick={() => {
              this.setState({
                visiblePopoverKey: 'selfDimEditor'
              })
            }}
            disabled={onlyRenderItem}
          >选择维度</Button>
          <Button
            className="mg2l"
            onClick={() => {
              setFieldsValue({
                'params.selfDim': []
              })
            }}
            disabled={onlyRenderItem}
          >清空</Button>
          {this.renderSelfDimensionEditModal(tablesSet)}
        </Form.Item>

        <Form.Item
          label="计算周期"
          {...formItemLayout}
        >
          {getFieldDecorator('params.cycle', {
            initialValue: _.get(currIdx, 'params.cycle', 'day'),
            rules: [
              {required: true, message: '必填'}
            ]
          })(
            <Select disabled={onlyRenderItem}>
              <Option key="day">天</Option>
              <Option key="week">周</Option>
              <Option key="month">月</Option>
            </Select>
          )}
        </Form.Item>

        <Form.Item
          label="保留小数位数"
          {...formItemLayout}
        >
          {getFieldDecorator('params.round', {
            initialValue: _.get(currIdx, 'params.round') || 2,
            rules: [
            ]
          })(
            <InputNumber disabled={onlyRenderItem} min={0} step={1} />
          )}
        </Form.Item>

        <Form.Item
          label="百分比格式"
          {...formItemLayout}
        >
          {getFieldDecorator('params.percentFormat', {
            initialValue: _.get(currIdx, 'params.percentFormat')
          })(
            <Checkbox disabled={onlyRenderItem}/>
          )}
        </Form.Item>
        
        <Form.Item
          label="所属分组"
          {...formItemLayout}
        >
          {getFieldDecorator('tags', {
            initialValue: _.get(currIdx, 'tags'),
            rules: [
            ]
          })(
            <Select
              mode="multiple"
              disabled={onlyRenderItem}
              // style={{ width: '100%' }}
            >
              {(tags || []).map(tag => {
                return (
                  <Option key={tag.id} value={tag.id}>{tag.name}</Option>
                )
              })}
            </Select>
          )}
        </Form.Item>

        <Form.Item
          label="责任部门"
          {...formItemLayout}
        >
          {getFieldDecorator('params.supervisorDepartments', {
            initialValue: _.get(currIdx, 'params.supervisorDepartments') || []
          })(
            <DepartmentPicker disabled={onlyRenderItem} style={{width: '100%'}} multiple={false} />
          )}
        </Form.Item>
        
        <Form.Item label="联系人" {...formItemLayout}>
          {getFieldDecorator('supervisor_id', {
            initialValue: _.get(currIdx, 'supervisor_id', _.get(window.sugo, 'user.id'))
          })(
            <Select
              allowClear
              disabled={onlyRenderItem}
              {...enableSelectSearch}
            >
              {(users || []).map(user => {
                const {first_name, username} = user || {}
                return (
                  <Option
                    key={user.id}
                    value={user.id}
                  >{first_name ? `${first_name}(${username})` : username}</Option>
                )
              })}
            </Select>
          )}
        </Form.Item>

        <Form.Item label="数据单位" {...formItemLayout}>
          {getFieldDecorator('params.measurementUnit', {
            initialValue: _.get(currIdx, 'params.measurementUnit'),
            rules: [
            ]
          })(
            <Select
              disabled={onlyRenderItem}
              {...enableSelectSearch}
              allowClear
            >
              {indicesValidUnits.map( (unit, i) => {
                return (
                  <Option key={i} value={unit}>{unit}</Option>
                )
              })}
            </Select>
          )}
        </Form.Item>
        
        <Form.Item label="业务口径" {...formItemLayout}>
          {getFieldDecorator('description', {
            initialValue: _.get(currIdx, 'description')
          })(<Input disabled={onlyRenderItem}/>)}
        </Form.Item>

        <Form.Item label="业务定义" {...formItemLayout}>
          {getFieldDecorator('business_definition', {
            initialValue: _.get(currIdx, 'business_definition')
          })(<Input disabled={onlyRenderItem}/>)}
        </Form.Item> 

        <Form.Item label="启用时间" {...formItemLayout}>
          {getFieldDecorator('start_time', {
            initialValue: _.get(currIdx, 'start_time') ? moment(_.get(currIdx, 'start_time'), 'YYYY/MM/DD') : moment(),
            rules: [{
              required: true,
              message: '启用时间不能为空'
            }]
          })(<DatePicker disabled={onlyRenderItem} format={'YYYY/MM/DD'} style={{width: '100%'}} />)}
        </Form.Item> 

        <Form.Item label="禁用时间" {...formItemLayout}>
          {getFieldDecorator('end_time', {
            initialValue: _.get(currIdx, 'end_time') ? moment(_.get(currIdx, 'end_time'), 'YYYY/MM/DD') : moment(),
            rules: [{
              required: true,
              message: '禁用时间不能为空'
            }]
          })(<DatePicker disabled={onlyRenderItem} format={'YYYY/MM/DD'} style={{width: '100%'}}/>)}
        </Form.Item> 

        <Form.Item label="统计类型" {...formItemLayout}>
          {getFieldDecorator('statistical_type', {
            initialValue: _.get(currIdx, 'statistical_type') || 0,
            rules: [{
              required: true,
              message: '统计类型不能为空'
            }]
          })(<Select disabled={onlyRenderItem}>
            {indicesStatisticalType.map((name, index) => (<Option key={index} value={index}>{name}</Option>))}
          </Select>)}
        </Form.Item> 

        <Form.Item label="是否汇总" {...formItemLayout}>
          {getFieldDecorator('is_summary', {
            initialValue: _.get(currIdx, 'is_summary') === undefined ? 0 :_.get(currIdx, 'is_summary'),
            rules: [{
              required: true,
              message: '是否汇总不能为空'
            }]
          })(<Select disabled={onlyRenderItem}>
            <Option key={1} value={1}>是</Option>
            <Option key={0} value={0}>否</Option>
          </Select>)}
        </Form.Item> 

        <Form.Item label="生成周期" {...formItemLayout}>
          {getFieldDecorator('generation_cycle', {
            initialValue: _.get(currIdx, 'generation_cycle') || 0,
            rules: [{
              required: true,
              message: '生成周期不能为空'
            }]
          })(<Select disabled={onlyRenderItem}>
            {indicesGenerationCycle.map((name, index) => (<Option key={index} value={index}>{name}</Option>))}
          </Select>)}
        </Form.Item> 

        <Form.Item label="数据格式" {...formItemLayout}>
          {getFieldDecorator('data_format', {
            initialValue: _.get(currIdx, 'data_format') || 0,
            rules: [{
              required: true,
              message: '数据格式不能为空'
            }]
          })(<Select disabled={onlyRenderItem}>
            {indicesDataFormat.map((name, index) => (<Option key={index} value={index}>{name}</Option>))}
          </Select>)}
        </Form.Item> 

        <Form.Item label="是否落地" {...formItemLayout}>
          {getFieldDecorator('is_landing', {
            initialValue: _.get(currIdx, 'is_landing') === undefined ? 0 : _.get(currIdx, 'is_landing'),
            rules: [{
              required: true,
              message: '是否落地不能为空'
            }]
          })(<Select disabled={onlyRenderItem}>
            <Option key={1} value={1}>是</Option>
            <Option key={0} value={0}>否</Option>
          </Select>)}
        </Form.Item> 

        <Form.Item label="是否发布" {...formItemLayout}>
          {getFieldDecorator('is_publish', {
            initialValue: _.get(currIdx, 'is_publish') === undefined ? 0 : _.get(currIdx, 'is_publish'),
            rules: [{
              required: true,
              message: '是否发布不能为空'
            }]
          })(<Select disabled={onlyRenderItem}>
            <Option key={1} value={1}>是</Option>
            <Option key={0} value={0}>否</Option>
          </Select>)}
        </Form.Item> 

        <Form.Item label="业务线条" {...formItemLayout}>
          {getFieldDecorator('business_line', {
            initialValue: _.get(currIdx, 'business_line'),
            rules: [{
              required: true,
              message: '业务线条不能为空'
            }]
          })(<Select disabled={onlyRenderItem}>
            {_.map(businessLineManagement, ({name, id}) => (<Option key={id} value={id}>{name}</Option>))}
          </Select>)}
        </Form.Item>

        <Form.Item
          label={(
            <span>
              生效时间&nbsp;
              <Tooltip title="指标的生效时间，长期有效/具体的时间段，如果超出了生效时间，则不再计算该指标.">
                <QuestionCircleOutlined />
              </Tooltip>
            </span>
          )}
          {...formItemLayout}
        >

          {getFieldDecorator('params.lifeCycle', {
            initialValue: _.get(currIdx, 'params.lifeCycle'),
            rules: [
              {
                type: 'array',
                validator(type, value, cb) {
                  let r = _.every(value, v => moment(v, 'YYYY-MM-DD').isValid())
                    ? []
                    : [ new Error('请选择指标过期时间') ]
                  cb(r)
                }
              }
            ]
          }) (
            <LifeCycleEditor disabled={onlyRenderItem}/>
          )}
        </Form.Item>
      </React.Fragment>
    )

    if (onlyRenderItem) return itemComponent
    
    return (
      <React.Fragment>
        <Bread
          path={[
            { name: '指标库', link: '/console/offline-calc/indices' },
            { name: isCreating ? '指标创建' : '指标编辑' }
          ]}
        />
        <div
          className="pd3t overscroll-y"
          style={{height: 'calc(100% - 44px)'}}
        >
          <Form
            onSubmit={this.onSubmit}
            className="width600 mg-auto"
          >
            <Form.Item label="指标编号" {...formItemLayout}>
              {getFieldDecorator('id', {
                initialValue: _.get(currIdx, 'id') || genIndicesId(),
                rules: [
                  { required: true, message: '未输入指标编号', whitespace: true },
                  { max: 32, message: '编号太长' },
                  { pattern: /^[a-z_-][\w-]+$/i, message: '只能输入英文字母、下划线、减号或数字，首字符不能为数字' }
                ]
              })(<Input disabled={!isCreating} />)}
            </Form.Item>
            {itemComponent}
            <Form.Item
              label={'\u00a0'}
              colon={false}
              {...formItemLayout}
            >
              <Button
                type="primary"
                htmlType="submit"
              >{isCreating ? '确认新建' : '保存修改'}</Button>
            </Form.Item>
          </Form>
        </div>
      </React.Fragment>
    );
  }
}
