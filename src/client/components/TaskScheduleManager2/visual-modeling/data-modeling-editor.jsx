/**
 * 可视化建模
 * 模型命名规范： model_xxx
 */
import React from 'react'
import ReactDOM from 'react-dom'
import _ from 'lodash'
import HorizontalSplitHelper from '../../Common/horizontal-split-helper'
import { DatabaseOutlined, FolderOutlined, TableOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Input, message, Radio, Select } from 'antd';
import ModelOutputColumnEditor from '../../OfflineCalc/model-output-column-editor'
import {
  groupToArrayDeep,
  immutateUpdate,
  immutateUpdates,
  isDiffByPath,
  isDiffBySomePath
} from '../../../../common/sugo-utils'
import DraggableTree from '../../OfflineCalc/draggable-tree'
import JoinConfigDiagram from '../../OfflineCalc/join-config-diagram'
import {enableSelectSearch} from '../../../common/antd-freq-use-props'
import {connect} from 'react-redux'
import {validateFieldsByForm} from '../../../common/decorators'
import withRuntimeSagaModel from '../../Common/runtime-saga-helper'
import {namespace as mainNS} from '../store/model'
import classNames from 'classnames'
import ObjectSelector from '~/components/common/object-selector'
import {VisualModelOutputTargetTypeEnum} from '../../../../common/constants'
import {hiveDataSourcesSagaModelGenerator, hiveTablesSagaModelGenerator} from './visual-modeling-saga-models'

const {Option} = Select
const {Item: FormItem} = Form

export const defaultEditMode = 'flowDesignMode'


function mapStateToProps(state, ownProps) {
  let {runtimeVisualModelingNS, modelId} = ownProps
  const dsList = state['hive-data-sources-for-data-modeling-editor'] || {}
  const tableList = state['hive-tables-for-data-modeling-editor'] || {}
  
  const offlineCalcDataSources = dsList.hiveDataSources || []
  const offlineCalcTables = tableList.hiveTables || []
  
  const mySQLDbs = _.filter(_.get(state.taskSchedule, 'dataDbs'), db => db.dbType === 'mysql')
  const visualModels = _.get(state[runtimeVisualModelingNS], 'visualModels') || []
  return {
    offlineCalcDataSources: offlineCalcDataSources,
    dsIdDict: _.keyBy(offlineCalcDataSources, ds => ds.id),
    offlineCalcTables: offlineCalcTables,
    tableIdDict: _.keyBy(offlineCalcTables, d => d.id),
    
    offlineCalcModels: modelId ? _.orderBy(visualModels, m => m.id === modelId ? -1 : 0) : [{}, ...visualModels],
    offlineCalcIndices: [],
    idxIdDict: {},
    tagIdDict: _.keyBy([], 'id'),
    mySQLDbs: mySQLDbs,
    tablesInSelectedDb: _.get(state.taskSchedule, 'dataTables') || []
  }
}


@Form.create()
@withRuntimeSagaModel([
  hiveDataSourcesSagaModelGenerator('hive-data-sources-for-data-modeling-editor'),
  hiveTablesSagaModelGenerator('hive-tables-for-data-modeling-editor')
])
@connect(mapStateToProps)
export default class DataModelingEditor extends React.Component {
  
  state = {
    visiblePopoverKey: null,
    selectedDiagramKey: null
  }
  
  componentDidMount() {
    const { innerRef, dispatch, mySQLDbs } = this.props
    
    if (_.isFunction(innerRef)) {
      innerRef(this)
    }
  }
  
  componentWillUnmount() {
    this.props.form.resetFields()
    let {innerRef} = this.props
    if (_.isFunction(innerRef)) {
      innerRef(null)
    }
  }
  
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (isDiffByPath(this.props, prevProps, 'offlineCalcModels[0].params.editMode')) {
      let {onEditModeChange} = this.props
      if (_.isFunction(onEditModeChange)) {
        onEditModeChange()
      }
    }
    // 根据所选目标数据源加载表信息
    if (isDiffBySomePath(this.props, prevProps, 'offlineCalcModels[0].params.outputToDataBase', 'mySQLDbs')) {
      let dbInfo = _.get(this.props, 'offlineCalcModels[0].params.outputToDataBase')
      if (dbInfo) {
        this.props.dispatch({
          type: `${mainNS}/getDataTables`,
          payload: {
            dbId: dbInfo.id
          }
        })
      }
    }
  }
  
  onSubmit = async ev => {
    let {offlineCalcModels, dispatch, form, modelId, idxIdDict, offlineCalcTables, runtimeVisualModelingNS} = this.props
    ev.preventDefault()
    let visualModel = await validateFieldsByForm(form)
    if (!visualModel) {
      this.setState({
        selectedDiagramKey: null
      })
      return message.error('保存失败')
    }
    // 判断重名列，并提醒需要重命名
    let outputCols = _.get(visualModel.params, 'outputCols') || []
    let outputColInfos = outputCols.map(oc => {
      let {dimId, renameTo, idxId} = oc
      if (renameTo) {
        return renameTo
      }
      if (dimId) {
        let [tableId, fieldName] = dimId.split('/')
        return {
          col: renameTo || fieldName,
          type: _(offlineCalcTables).chain()
            .find(t => t.id === tableId)
            .get('params.fieldInfos')
            .find(fi => fi.field === fieldName)
            .get('type')
            .value()
        }
      }
      if (idxId) {
        let idx = idxIdDict[idxId]
        if (!idx) {
          throw new Error(`Missing index: ${idxId}`)
        }
        return {
          col: renameTo || idx.name,
          type: 'NUMBER'
        }
      }
      throw new Error('Unexpected output column type: ' + JSON.stringify(oc))
    })
    if (outputColInfos.length > _.uniqBy(outputColInfos, 'col').length) {
      message.warn('存在同名的输出列，请先进行重命名')
      return
    }
    // 冗余记录依赖的维表和指标，方便判断依赖
    visualModel = immutateUpdates(visualModel,
      'params.tableDeps', () => _.map(_.get(visualModel, 'params.diagramInfo.tables') || [], t => t.id),
      'params.idxDeps', () => outputCols.filter(oc => oc.idxId).map(oc => oc.idxId))
    const currIdInUrl = modelId || 'new'
    const isCreating = currIdInUrl === 'new'
    let nextModels = isCreating
      ? offlineCalcModels.map((d, i) => i === 0 ? visualModel : d)
      : offlineCalcModels.map(d => d.id === currIdInUrl ? {...d, ...visualModel} : d)
    await new Promise(resolve => {
      dispatch({
        type: `${runtimeVisualModelingNS}/sync`,
        payload: nextModels,
        callback: syncRes => {
          let {resCreate, resUpdate} = syncRes || {}
          if (_.isEmpty(resCreate) && _.isEmpty(resUpdate)) {
            message.warn('没有修改数据，无须保存')
            resolve()
            return
          }
          if (_.isEmpty(_.compact(resCreate)) && _.isEmpty(_.compact(resUpdate))) {
            // 保存报错
            resolve()
            return
          }
          const isCreated = _.isEmpty(resUpdate)
          message.success((
            <span>{isCreated ? '创建' : '修改'}数据模型成功</span>
          ))
          resolve()
        }
      })
    })
  }
  
  renderTablesPicker = () => {
    let { dsIdDict, tagIdDict, offlineCalcTables } = this.props
    const clonedByTags = _.flatMap(offlineCalcTables, idx => {
      return _.size(idx.tags) < 2 ? idx : idx.tags.map(tId => ({...idx, tags: [tId]}))
    })
    let databaseIcon = <DatabaseOutlined />
    let folderIcon = <FolderOutlined />
    let tableIcon = <TableOutlined />
    let treeInfo = groupToArrayDeep(clonedByTags,
      [t => t.tags[0] || '', t => t.data_source_id || ''],
      [
        (arr, tagId) => tagId
          ? {key: tagId, title: _.get(tagIdDict[tagId], 'name', tagId), children: arr, selectable: false, icon: folderIcon}
          : arr,
        (arr, dsId) => ({
          key: dsId,
          title: _.get(dsIdDict[dsId], 'name', dsId),
          children: arr,
          selectable: false,
          icon: databaseIcon
        }),
        table => ({ key: `table:${table.id}`, title: table.title || table.name, selectable: true, icon: tableIcon })
      ])
    return (
      <React.Fragment>
        <div className="pd2l pd1y elli line-height30 shadowb-eee mg1b" >维表</div>
        <div style={{height: 'calc(100% - 45px)'}} >
          <DraggableTree
            treeInfo={treeInfo}
            className="height-100 overscroll-y"
            showIcon
          />
        </div>
      </React.Fragment>
    )
  }
  
  detectColCanNotDel = (prevOutputCols, nextOutputCols) => {
    let {tableIdDict, idxIdDict} = this.props
    let [deletedCol] = _.differenceBy(prevOutputCols, nextOutputCols, oc => oc.dimId || oc.idxId)
    const preDeselectedField = deletedCol && deletedCol.dimId
    if (preDeselectedField) {
      let [tableId, fieldName] = preDeselectedField.split('/')
      let table = tableIdDict[tableId]
      let dimIdCanNotDel = `${table.data_source_id}|${table.name}|${fieldName}`
      let currUsingIndices = _.filter(prevOutputCols, oc => oc.idxId).map(oc => idxIdDict[oc.idxId])
      let idxCanNotDel = _.find(currUsingIndices, idx => {
        return _.includes(this.resolveAllDimDepsOfIndex(idx), dimIdCanNotDel)
      })
      if (idxCanNotDel) {
        let idx = idxCanNotDel
        let errMsg = `此字段被指标 ${idx.title ? `${idx.name}（${idx.title}）` : idx.name} 所依赖，不能删除`
        throw new Error(errMsg)
      }
    }
  }
  
  renderColumnPreviewTable = () => {
    const { getFieldDecorator, getFieldValue, setFieldsValue } = this.props.form
    let { offlineCalcModels, tableIdDict, offlineCalcIndices, idxIdDict, disabled } = this.props
    let currModel = _.get(offlineCalcModels, [0])
    return (
      <React.Fragment>
        <div className="pd2l pd1y elli line-height30" >数据模型表</div>
        <div
          style={{height: 'calc(100% - 45px)'}}
          className="overscroll-y pd1x hide-scrollbar-y"
        >
          {getFieldDecorator('params.outputCols', {
            // [{dimId: 'tableId/field', renameTo: 'xx'}, {idxId: 'xxx', renameTo: 'xxx'}]
            initialValue: _.get(currModel, 'params.outputCols') || [],
            rules: [ ]
          })(
            <ModelOutputColumnEditor
              disabled={disabled}
              offlineCalcIndices={offlineCalcIndices}
              tableIdDict={tableIdDict}
              idxIdDict={idxIdDict}
              onChange={nextOutputCols => {
                const prevOutputCols = getFieldValue('params.outputCols')
                try {
                  this.detectColCanNotDel(prevOutputCols, nextOutputCols)
                } catch (e) {
                  setTimeout(() => {
                    setFieldsValue({
                      'params.outputCols': prevOutputCols
                    })
                  }, 100)
                  message.warn(e.message)
                  return
                }
                let [deletedCol] = _.differenceBy(prevOutputCols, nextOutputCols, oc => oc.dimId || oc.idxId)
                const preDeselectedField = deletedCol && deletedCol.dimId
                if (preDeselectedField) {
                  let [tableId, fieldName] = preDeselectedField.split('/')
                  // 移除关系图里选择了的字段
                  let prevDiagramInfo = getFieldValue('params.diagramInfo')
                  let nextDiagramInfo = immutateUpdate(prevDiagramInfo, 'tables', tables => {
                    return tables.map(t => {
                      return t.id !== tableId
                        ? t
                        : { ...t, fields: t.fields.map(f => f.field === fieldName ? _.omit(f, 'selected') : f)}
                    })
                  })
                  setFieldsValue({
                    'params.diagramInfo': nextDiagramInfo
                  })
                }
              }}
            />
          )}
        </div>
      </React.Fragment>
    )
  }
  
  renderJoinConfigDiagram = () => {
    const { getFieldDecorator, getFieldValue, setFieldsValue } = this.props.form
    let { offlineCalcModels, tableIdDict, idxIdDict, disabled } = this.props
    let {selectedDiagramKey} = this.state
    
    let currModel = _.get(offlineCalcModels, [0])
    
    const initialDiagramVal = _.get(currModel, 'params.diagramInfo')
    let prevOutputCols = getFieldValue('params.outputCols')
    const prevSelectedFields = _.filter(prevOutputCols, oc => oc.dimId).map(oc => oc.dimId)
    return (
      getFieldDecorator('params.diagramInfo', {
        initialValue: initialDiagramVal,
        rules: [ ]
      })(
        <JoinConfigDiagram
          disabled={disabled}
          tableIdDict={tableIdDict}
          selectedFields={prevSelectedFields}
          onSelectedFieldsChange={nextSelectedFields => {
            // 选择字段时更新 outputCols
            // tableId/fieldName
            let selectedDimIdsSet = new Set(nextSelectedFields)
            let patchedOutputCols = _.uniqBy([...prevOutputCols, ...nextSelectedFields.map(dimId => ({dimId}))], oc => oc.dimId || oc.idxId)
            // [{dimId: 'tableId/field', renameTo: 'xx'}, {idxId: 'xxx', renameTo: 'xxx'}]
            const nextOutputCols = _.filter(patchedOutputCols, oc => oc.idxId ? true : selectedDimIdsSet.has(oc.dimId))
            
            // 判断字段是否被指标依赖
            try {
              this.detectColCanNotDel(prevOutputCols, nextOutputCols)
              setFieldsValue({
                'params.outputCols': nextOutputCols
              })
            } catch (e) {
              message.warn(e.message)
            }
          }}
          onChange={(next, prev) => {
            const prevTableIds = _.map(_.get(prev, 'tables'), t => t.id)
            const currTableIds = _.map(_.get(next, 'tables'), t => t.id)
            let [preDelTable] = _.difference(prevTableIds, currTableIds)
            if (!preDelTable) {
              return
            }
            // 删除表时判断指标依赖
            let table = tableIdDict[preDelTable]
            let tableIdForDimDeps = `${table.data_source_id}|${table.name}`
            let currUsingIndices = _.filter(prevOutputCols, oc => oc.idxId).map(oc => idxIdDict[oc.idxId])
            let idxCanNotDel = _.find(currUsingIndices, idx => {
              let dimDeps = this.resolveAllDimDepsOfIndex(idx)
              return _.some(dimDeps, dimDep => _.startsWith(dimDep, tableIdForDimDeps))
            })
            if (idxCanNotDel) {
              let idx = idxCanNotDel
              message.warn(`此表被指标 ${idx.title ? `${idx.name}（${idx.title}）` : idx.name} 所依赖，不能删除`)
              setTimeout(() => {
                setFieldsValue({
                  'params.diagramInfo': prev
                })
              }, 100)
            }
          }}
          selectedKey={selectedDiagramKey}
          onSelect={modelKey => {
            this.setState({
              selectedDiagramKey: modelKey
            })
          }}
        />
      )
    )
  }
  
  renderPropsConfigurator = () => {
    let { tableIdDict, disabled } = this.props
    const { getFieldValue, setFieldsValue } = this.props.form
    
    let {selectedDiagramKey} = this.state
    let overwriteDom = null // 避免 form 组件被卸载，如果需要展示其他配置页面，则把模型配置通过样式隐藏
    if (selectedDiagramKey in tableIdDict) {
      const table = tableIdDict[selectedDiagramKey]
      let diagramInfo = getFieldValue('params.diagramInfo')
      let selectedFields = _(diagramInfo)
        .chain()
        .get('tables')
        .find(t => t.id === selectedDiagramKey)
        .get('fields')
        .map(f => f.field)
        .value()
      let fieldNameDict = _.keyBy(_.get(table.params, 'fieldInfos'), 'field')
      overwriteDom = (
        <React.Fragment>
          <div className="pd2l pd1y elli line-height30 shadowb-eee mg1b" >{`${table.title || table.name} 属性配置`}</div>
          <div style={{height: 'calc(100% - 45px)', overflowX: 'hidden'}} className="overscroll-y">
            <Form
              className="pd2"
              layout="vertical"
            >
              <Form.Item label="使用维度" >
                <Select
                  disabled={disabled}
                  mode="multiple"
                  placeholder="未添加维度"
                  {...enableSelectSearch}
                  value={selectedFields}
                  onChange={vals => {
                    // 移除已连接的字段时自动移除连接，和输出字段
                    let preDelField = _.difference(selectedFields, vals)[0]
                    let preDelFieldId = preDelField && `${table.id}/${preDelField}`
                    let prevOutputCols = getFieldValue('params.outputCols')
                    
                    let nextDiagramInfo = immutateUpdates(diagramInfo,
                      'joinLinks', joinLinks => {
                        return !preDelFieldId
                          ? joinLinks
                          : (joinLinks || []).filter(jl => !(jl.source === preDelFieldId || jl.target === preDelFieldId))
                      },
                      'tables', tables => {
                        return tables.map(t => {
                          return t.id !== selectedDiagramKey
                            ? t
                            : { ...t, fields: vals.map(fieldName => fieldNameDict[fieldName]) }
                        })
                      })
                    let nextOutputCols = _.filter(prevOutputCols, oc => oc.dimId ? oc.dimId !== preDelFieldId : true)
                    try {
                      this.detectColCanNotDel(prevOutputCols, nextOutputCols)
                      setFieldsValue({
                        'params.diagramInfo': nextDiagramInfo,
                        'params.outputCols': nextOutputCols
                      })
                    } catch (e) {
                      message.warn(e.message)
                    }
                  }}
                >
                  {_.uniqBy(_.get(table.params, 'fieldInfos') || [], 'field').map(fieldInfo => {
                    const {field, type} = fieldInfo || {}
                    return (
                      <Option
                        key={field}
                        value={field}
                      >{field}</Option>
                    )
                  })}
                </Select>
              </Form.Item>
            </Form>
          </div>
        </React.Fragment>
      )
    }
    
    return this.renderModelPropsConfigurator(overwriteDom)
  }
  
  renderModelPropsConfigurator = (overwriteDom) => {
    let { typeId, offlineCalcModels, disabled } = this.props
    let currModel = _.get(offlineCalcModels, [0])
    
    const { getFieldDecorator, getFieldValue } = this.props.form
    getFieldDecorator('type_id', {
      initialValue: _.get(currModel, 'type_id') || typeId,
      rules: []
    })
    return (
      <React.Fragment>
        {overwriteDom}
        <div className={classNames('pd2l pd1y elli line-height30 shadowb-eee mg1b', {hide: overwriteDom})} >属性配置</div>
        <div
          style={{height: 'calc(100% - 45px)', overflowX: 'hidden'}}
          className={classNames('overscroll-y', {hide: overwriteDom})}
        >
          <Form
            className="pd2"
            layout="vertical"
          >
            <Form.Item label="模型表名">
              {getFieldDecorator('name', {
                initialValue: _.get(currModel, 'name') || 'model_',
                rules: [
                  { required: true, message: '未输入模型表名', whitespace: true },
                  { max: 32, message: '名称太长' },
                  { min: 4, message: '名称太短' },
                  { pattern: /^[a-zA-Z]\w*$/, message: '只能输入英文字母、下划线和数字，必须以字母开头' }
                ]
              })(<Input disabled={disabled}/>)}
            </Form.Item>
  
            <FormItem label="模型描述" className="mg1b" hasFeedback>
              {getFieldDecorator('description', {
                initialValue: _.get(currModel, 'description', '')
              })(
                <Input />
              )}
            </FormItem>
            
            {getFieldValue('params.outputTargetType') === VisualModelOutputTargetTypeEnum.MySQL
              ? this.renderMySQLTablePicker()
              : null}
            
          </Form>
        </div>
      </React.Fragment>
    );
  }
  
  renderMySQLTablePicker = () => {
    const { getFieldDecorator, setFieldsValue } = this.props.form
    let { offlineCalcModels, mySQLDbs, dispatch, tablesInSelectedDb } = this.props
    let currModel = _.get(offlineCalcModels, [0])
    return (
      <React.Fragment>
        <FormItem label="目标数据库">
          {getFieldDecorator('params.outputToDataBase', {
            initialValue: _.get(currModel, 'params.outputToDataBase'),
            rules: [ { required: true, message: '请填写目标数据库' } ]
          })(
            // dbAlais: "224PG"
            // dbIp: "192.168.0.224"
            // dbName: "azkaban"
            // dbPassword: "123456"
            // dbPort: 15432
            // dbType: "postgresql"
            // dbUser: "postgres"
            // id: 129
            // refProjectId: "qaz-plm-wsx"
            // schema: "public"
            <ObjectSelector
              options={mySQLDbs || []}
              getKey={o => o.id}
              getTitle={o => o.dbAlais}
              onChange={dbInfo => {
                dispatch({
                  type: `${mainNS}/getDataTables`,
                  payload: {
                    dbId: dbInfo.id
                  }
                })
                setFieldsValue({
                  'params.outputToTable': null
                })
              }}
              {...enableSelectSearch}
            />
          )}
        </FormItem>
  
        <FormItem label="目标表">
          {getFieldDecorator('params.outputToTable', {
            initialValue: _.get(currModel, 'params.outputToTable'),
            rules: [ { required: true, message: '请填写目标表' } ]
          })(
            <Select
              {...enableSelectSearch}
            >
              {(tablesInSelectedDb || []).map(table => {
                return (
                  <Option key={table.tableName} value={table.tableName}>{table.tableName}</Option>
                )
              })}
            </Select>
          )}
        </FormItem>
      </React.Fragment>
    )
  }
  
  handleDragToRelationChart = ev => {
    let { idxIdDict, tableIdDict, offlineCalcTables, disabled } = this.props
    const { getFieldValue, setFieldsValue } = this.props.form
    if (disabled) {
      return
    }
    let diagramInfo = getFieldValue('params.diagramInfo')
    let outputCols = getFieldValue('params.outputCols')
    
    ev.preventDefault()
    ev.stopPropagation()
    let payload = ev.dataTransfer.getData('text')
    // console.log(ev, payload)
    let domRect = ev.target.getBoundingClientRect()
    let x = ev.clientX - domRect.left, y = ev.clientY - domRect.top
    // 添加指标依赖的维表和字段到关系图
    let preAddTables, preAddCols
    if (_.startsWith(payload, 'index:')) {
      let [dragType, idxId] = payload.split(':')
      let idx = idxIdDict[idxId]
      if (!idx) {
        return
      }
      let dimDeps = this.resolveAllDimDepsOfIndex(idx)
      let dimIdDeps = _(dimDeps)
        .uniq()
        .map(dimDep => {
          let [dsId, tableName, fieldName] = dimDep.split('|')
          let table = _.find(offlineCalcTables, t => t.data_source_id === dsId && t.name === tableName)
          return table && { dimId: `${table.id}/${fieldName}` }
        })
        .compact()
        .value()
      preAddCols = [{idxId}, ...dimIdDeps]
      preAddTables = _(dimDeps).uniq()
        .map(dimDep => {
          let [dsId, tableName, fieldName] = dimDep.split('|')
          return { dsId, tableName, fieldName }
        })
        .groupBy(dep => `${dep.dsId}/${dep.tableName}`)
        .mapValues(deps => {
          let dsId = deps[0].dsId, tableName = deps[0].tableName
          let table = _.find(offlineCalcTables, t => t.data_source_id === dsId && t.name === tableName)
          if (!table) {
            return null
          }
          let fieldNameSet = new Set(deps.map(d => d.fieldName))
          return {
            id: table.id,
            name: table.name,
            title: table.title,
            // fields: []
            fields: (_.get(table.params, 'fieldInfos') || []).filter(fi => fieldNameSet.has(fi.field))
          }
        })
        .values()
        .filter(_.identity)
        .value()
    } else if (_.startsWith(payload, 'table:')) {
      let [dragType, tableId] = payload.split(':')
      let table = tableIdDict[tableId]
      if (_.some(diagramInfo && diagramInfo.tables, t => t.id === tableId)) {
        message.warn('此维表已经添加过了')
        return
      }
      preAddCols = []
      preAddTables = [{
        id: tableId,
        name: table.name,
        title: table.title,
        fields: []
      }]
    } else {
      throw new Error('Unknown drag payload: ' + payload)
    }
    const nextDiagramInfo = immutateUpdate(diagramInfo, 'tables', tables => {
      let offset = 0
      return preAddTables.reduce((accTables, curr, i) => {
        let prev = _.find(accTables, t => t.id === curr.id)
        if (prev) {
          const position = {x: x + offset * 15, y: y + offset * 15}
          return _.map(accTables, t => {
            return t === prev
              ? {
                ...t,
                position,
                fields: _.uniqBy([...t.fields, ...curr.fields], 'field')
              }
              : t
          })
        }
        const position = {x: x + offset * 15, y: y + offset * 15}
        offset += 1
        return [...(accTables || []), {...curr, position}]
      }, tables)
    })
    setFieldsValue({
      'params.diagramInfo': nextDiagramInfo,
      // 更新字段数组
      'params.outputCols': _.uniqBy([...outputCols, ...preAddCols], c => c.dimId || c.idxId)
    })
  }
  
  
  renderModeSwitchBtn = () => {
    let {extraFooterBtnContainer, onEditModeChange, form} = this.props
    if (!extraFooterBtnContainer) {
      return null
    }
    let { form: { getFieldDecorator }, offlineCalcModels } = this.props
    let currModel = _.get(offlineCalcModels, [0])
    let content = (
      getFieldDecorator('params.editMode', {
        initialValue: _.get(currModel, 'params.editMode') || defaultEditMode
      })(
        <Radio.Group
          onChange={ev => {
            let {value} = ev.target
            if (_.isFunction(onEditModeChange)) {
              onEditModeChange(value)
            }
            form.resetFields()
          }}
        >
          <Radio.Button value="visualModelingMode">可视化模式</Radio.Button>
          <Radio.Button value="flowDesignMode">高级模式</Radio.Button>
        </Radio.Group>
      )
    )
    return ReactDOM.createPortal(content, extraFooterBtnContainer)
  }
  
  render() {
    const { getFieldValue } = this.props.form
    let editMode = getFieldValue('params.editMode') || defaultEditMode
    
    const columnPreviewTableDom = this.renderColumnPreviewTable()
    
    return (
      <div style={{height: 'calc(100vh - 55px - 24px * 2 - 30px)'}}>
        {this.renderModeSwitchBtn()}
        <HorizontalSplitHelper
          className="contain-docs-analytic height-100"
        >
          <div
            defaultWeight={8}
            className="itblock height-100"
            style={{
              padding: '5px 5px 10px 10px'
            }}
          >
            <div className="bg-white height-100 corner" >
              {this.renderTablesPicker()}
            </div>
          </div>
    
          <div
            className="itblock height-100"
            style={{padding: '10px 5px 10px 5px'}}
            defaultWeight={40}
          >
            <div
              className="bg-white corner relative"
              style={{height: 'calc(100% - 170px - 10px)'}}
              onDragOver={ev => ev.preventDefault()}
              onDrop={this.handleDragToRelationChart}
            >
              {this.renderJoinConfigDiagram()}
              {!_.isEmpty(_.get(getFieldValue('params.diagramInfo'), 'tables')) ? null : (
                <div className="pd3 color-666 font18 aligncenter absolute top0 width-100 ignore-mouse">
                  请拖拽维表到这里
                </div>
              )}
            </div>
      
            <div
              className="bg-white corner"
              style={{height: 170, marginTop: '10px'}}
            >
              {columnPreviewTableDom}
            </div>
          </div>
    
          <div
            defaultWeight={12}
            className="itblock height-100"
            style={{
              padding: '10px 10px 10px 5px'
            }}
          >
            <div className="bg-white corner height-100">
              {this.renderPropsConfigurator()}
            </div>
          </div>
        </HorizontalSplitHelper>
      </div>
    )
  }
}
