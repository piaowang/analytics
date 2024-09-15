import React from 'react'
import Bread from '../Common/bread'

import {
  AreaChartOutlined,
  CaretRightOutlined,
  CopyOutlined,
  DatabaseOutlined,
  FolderOutlined,
  QuestionCircleOutlined,
  SaveOutlined,
  TableOutlined,
} from '@ant-design/icons';

import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';

import { Button, Input, message, Select, Tooltip, Tabs } from 'antd';
import _ from 'lodash'
import {getUsers} from '../../actions'
import {connect} from 'react-redux'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import {validateFieldsByForm} from '../../common/decorators'
import {browserHistory} from 'react-router'
import {
  dataSourceListSagaModelGenerator,
  indicesSagaModelGenerator,
  modelsSagaModelGenerator,
  releaseSagaModelGenerator,
  tableListSagaModelGenerator,
  tagSagaModelGenerator
} from './saga-model-generators'
import {
  OfflineCalcTargetType,
  OfflineCalcVersionStatus,
  TagTypeEnum,
  VisualModelCalcTypeEnum,
  VisualModelOutputTargetTypeEnum,
  VisualModelCalcTypeTranslation,
  VisualModelOutputTargetTypeTranslation,
  OfflineCalcDataSourceTypeEnum,
  VisualModelUpdateStrategyEnum
} from '../../../common/constants'
import {groupToArrayDeep, immutateUpdate, immutateUpdates} from '../../../common/sugo-utils'
import HorizontalSplitHelper from '../Common/horizontal-split-helper'
import VerticalSplitHelper from '../Common/vertical-split-helper'
import DraggableTree from './draggable-tree'
import JoinConfigDiagram from './join-config-diagram'
import DepartmentPicker from '../Departments/department-picker'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import moment from 'moment'
import LifeCycleEditor from './life-cycle-editor'
import OptionalWrapper from './optional-wrapper'
import CronPicker from '../Common/cron-picker'
import {SELECT_PERIOD} from '../../common/cron-picker-kit'
import ModelOutputColumnEditor from './model-output-column-editor'
import ReleaseModal from './release-version'
import classNames from 'classnames'
import ModelPublisher from './model-publisher'
import copyTextToClipboard from '../../common/copy'
import offlineCalcModelToSql, { guessDruidStrTypeByDbDataType }from '../../../common/offline-calc-model-helper'
import {hiveDataSourcesSagaModelGenerator} from '../TaskScheduleManager2/visual-modeling/visual-modeling-saga-models'
import EditFilterModal from './edit-filter-modal'
import ObjectSelector from '~/components/common/object-selector'
import DisplayFilterPanel from './display-filter-panel'

const namespace = 'offline-calc-models-edit'

const isDevEnv = _.startsWith(_.get(window.sugo, 'env'), 'dev')

const initialCronVal = {
  unitType: '0',  // 0=每；1=每隔；2=自定义
  period: SELECT_PERIOD.Hour,
  option: {
    minute: '0',
    hour: '0',
    day: '1',
    month: '1'
  }
}


const {Option} = Select
const {TabPane} = Tabs

let mapStateToProps = (state, ownProps) => {
  const editingModelsObj = state[namespace] || {}
  const tableList = state['pick-offline-calc-table-in-model-editor'] || {}
  const indicesList = state['pick-offline-calc-indices-in-model-editor'] || {}
  const dsList = state['offline-calc-data-sources-for-model-edit'] || {}
  const modelTagList = state[`model-tags-for-dim-edit_${TagTypeEnum.offline_calc_model}`] || {}
  const indicesTagList = state[`indices-tags-for-dim-edit_${TagTypeEnum.offline_calc_index}`] || {}
  const hiveDsList = state['pick-hive-ds-name-for-model-editor'] || {}
  return {
    ...editingModelsObj,
    offlineCalcDataSources: dsList.offlineCalcDataSources || [],
    dsIdDict: _.keyBy(dsList.offlineCalcDataSources, ds => ds.id),
    modelTags: modelTagList.tags,
    indicesTags: indicesTagList.tags,
    tagIdDict: _.keyBy([...(modelTagList.tags || []), ...(indicesTagList.tags || [])], t => t.id),
    offlineCalcTables: tableList.offlineCalcTables || [],
    offlineCalcIndices: indicesList.offlineCalcIndices || [],
    tableIdDict: _.keyBy(tableList.offlineCalcTables, d => d.id),
    idxIdDict: _.keyBy(indicesList.offlineCalcIndices, d => d.id),
    users: _.get(state, 'common.users', []),
    hiveDataSources: hiveDsList.hiveDataSources || []
  }
}


@connect(mapStateToProps)
@withRuntimeSagaModel([
  modelsSagaModelGenerator(namespace, 'single'),
  tableListSagaModelGenerator('pick-offline-calc-table-in-model-editor'),
  indicesSagaModelGenerator('pick-offline-calc-indices-in-model-editor'),
  dataSourceListSagaModelGenerator('offline-calc-data-sources-for-model-edit'),
  tagSagaModelGenerator('model-tags-for-dim-edit', TagTypeEnum.offline_calc_model),
  tagSagaModelGenerator('indices-tags-for-dim-edit', TagTypeEnum.offline_calc_index),
  releaseSagaModelGenerator(),
  hiveDataSourcesSagaModelGenerator('pick-hive-ds-name-for-model-editor')
])
@Form.create()
export default class OfflineCalcModelsEdit extends React.Component {
  state = {
    visiblePopoverKey: null,
    selectedDiagramKey: null,
    showFilterEdit: false,
    selectTables: []
  }
  
  componentDidMount() {
    this.props.dispatch(getUsers())
  }
  
  componentDidUpdate(prevProps, prevState, snapshot) {
    // if (isDiffByPath(this.props, prevProps, 'offlineCalcDimensionsBak')) {
    //   this.props.form.resetFields()
    // }
  }

  onSubmitReview = async ev => {
    this.props.dispatch({
      type: 'offlineCalcReleaseVersion/change',
      payload: { modalVisible: true, modalTitle: '提交审核' }
    })
  }

  passReview = async ev => {
    this.props.dispatch({
      type: 'offlineCalcReleaseVersion/change',
      payload: {modalVisible: true, modalTitle: '通过审核', reviewResult: OfflineCalcVersionStatus.pass}
    })
  }
  
  noPassReview = async ev => {
    this.props.dispatch({
      type: 'offlineCalcReleaseVersion/change',
      payload: {modalVisible: true, modalTitle: '不通过审核', reviewResult: OfflineCalcVersionStatus.noPass}
    })
  }

  passDelReview = async ev => {
    let { users, modelTags: tags, offlineCalcModels, tableIdDict, location } = this.props

    let currModel = _.get(offlineCalcModels, [0])
    const { id } = this.props.params
    this.props.dispatch({
      type: 'offlineCalcReleaseVersion/delReview',
      payload: { 
        id: `${id}/${currModel.SugoVersionHistory.version}`, 
        reviewResult: OfflineCalcVersionStatus.deleted, 
        handleSuccess: () => {
          message.success('提交成功')
          return browserHistory.push('/console/offline-calc/review-manager')
        }
      }
    })
  }
  
  noPassDelReview = async ev => {
    let { users, modelTags: tags, offlineCalcModels, tableIdDict, location } = this.props
    
    let currModel = _.get(offlineCalcModels, [0])
    const { id } = this.props.params
    this.props.dispatch({
      type: 'offlineCalcReleaseVersion/delReview',
      payload: {
        id: `${id}/${currModel.SugoVersionHistory.version}`,
        reviewResult: OfflineCalcVersionStatus.noPass,
        handleSuccess: () => {
          message.success('提交成功')
          return browserHistory.push('/console/offline-calc/review-manager')
        }
      }
    })
  }
  
  onSubmit = async ev => {
    let {offlineCalcModels, dispatch, form, params, idxIdDict} = this.props
    ev.preventDefault()
    let formVals = await validateFieldsByForm(form)
    if (!formVals) {
      this.setState({
        selectedDiagramKey: null
      })
      return message.error('表单验证不通过')
    }
    // 判断重名列，并提醒需要重命名
    const isCalcTypeSelect = (_.get(formVals, 'params.calcType') || VisualModelCalcTypeEnum.Select) === VisualModelCalcTypeEnum.Select
    let outputCols = _.get(formVals.params, 'outputCols') || []
    let outputColNames = outputCols.filter(oc => isCalcTypeSelect ? oc.dimId : true).map(oc => {
      let {dimId, renameTo, idxId} = oc
      if (renameTo) {
        return renameTo
      }
      if (dimId) {
        let [tableId, fieldName] = dimId.split('/')
        return fieldName
      }
      if (idxId) {
        let idx = idxIdDict[idxId]
        return idx ? idx.name : '(指标已删除)'
      }
      throw new Error('Unexpected output column type: ' + JSON.stringify(oc))
    })
    if (outputColNames.length > _.uniq(outputColNames).length) {
      message.warn(`存在同名的输出列，请先进行重命名: ${_(outputColNames).countBy().pickBy(v => v > 1).keys().value()}`)
      return
    }
    // 冗余记录依赖的维表和指标，方便判断依赖
    formVals = immutateUpdates(formVals,
      'params.tableDeps', () => _.map(_.get(formVals, 'params.diagramInfo.tables') || [], t => t.id),
      'params.idxDeps', () => outputCols.filter(oc => oc.idxId).map(oc => oc.idxId))
    const currIdInUrl = _.get(params, 'id')
    const isCreating = currIdInUrl === 'new'
    let nextModels = isCreating
      ? [formVals]
      : offlineCalcModels.map(d => d.id === currIdInUrl ? {...d, ...formVals} : d)
    await dispatch({
      type: `${namespace}/sync`,
      payload: nextModels,
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
        message.success((
          <span>{isCreated ? '创建' : '修改'}指标模型成功</span>
        ))
        if (isCreated) {
          let createdId = _.get(resCreate, [0, 'result', 'id'])
          browserHistory.push(`/console/offline-calc/models/${createdId}`)
          dispatch({ type: `${namespace}/fetch`, payload: createdId})
        }
  
        // 编辑了公有版本，切换到私有版本
        if (!_.isEmpty(resUpdate)) {
          let updatedAPIId = _.get(resUpdate, [0, 'result', 'id'])
          if (updatedAPIId) browserHistory.push(`/console/offline-calc/models/${updatedAPIId}`)
        }
      }
    })
  }
  
  renderIndicesPicker = () => {
    let { dsIdDict, tagIdDict, offlineCalcIndices } = this.props
    const clonedByTags = _.flatMap(offlineCalcIndices, idx => {
      return _.size(idx.tags) < 2 ? idx : idx.tags.map(tId => ({...idx, tags: [tId]}))
    })
    let databaseIcon = <DatabaseOutlined />
    let folderIcon = <FolderOutlined />
    let indicesIcon = <AreaChartOutlined />
    let treeInfo = groupToArrayDeep(clonedByTags,
      [idx => idx.data_source_id || '', idx => idx.tags[0] || ''],
      [
        (arr, dsId) => {
          return dsId
            ? { key: dsId, title: _.get(dsIdDict[dsId], 'name', dsId), children: arr, selectable: false, icon: databaseIcon }
            : {key: 'null', title: '跨数据源', children: arr, selectable: false, icon: databaseIcon}
        },
        (arr, tagId) => tagId
          ? {key: tagId, title: _.get(tagIdDict[tagId], 'name', tagId), children: arr, selectable: false, icon: folderIcon}
          : arr,
        idx => ({
          key: `index:${idx.id}`,
          title: idx.title || idx.name,
          hoverTitle: `公式：${_.get(idx.formula_info, 'uiText')}\n版本：${_.get(idx, 'SugoVersionHistory.version')}`,
          selectable: true,
          icon: indicesIcon
        })
      ])
    return (
      <React.Fragment>
        <div className="pd2l pd1y elli line-height30 shadowb-eee mg1b" >指标库</div>
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
  
  renderTablesPicker = () => {
    let {
      users, params, offlineCalcModels, offlineCalcDataSources, modelTags, indicesTags, idxIdDict, dsIdDict, tagIdDict,
      offlineCalcTables
    } = this.props
    const clonedByTags = _.flatMap(offlineCalcTables, idx => {
      return _.size(idx.tags) < 2 ? idx : idx.tags.map(tId => ({...idx, tags: [tId]}))
    })
    let databaseIcon = <DatabaseOutlined />
    let folderIcon = <FolderOutlined />
    let tableIcon = <TableOutlined />
    let treeInfo = groupToArrayDeep(clonedByTags,
      [idx => idx.data_source_id || '', idx => _.get(idx, 'tags[0]') || ''],
      [
        (arr, dsId) => ({key: dsId, title: _.get(dsIdDict[dsId], 'name', dsId), children: arr, selectable: false, icon: databaseIcon}),
        (arr, tagId) => tagId
          ? {key: tagId, title: _.get(tagIdDict[tagId], 'name', tagId), children: arr, selectable: false, icon: folderIcon}
          : arr,
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
  
  renderJoinConfigDiagram = () => {
    const { getFieldDecorator, getFieldValue, setFieldsValue } = this.props.form
    let { offlineCalcModels, tableIdDict, idxIdDict, location } = this.props
    let {selectedDiagramKey} = this.state

    let currModel = _.get(offlineCalcModels, [0])
    let disabled = _.get(location, 'query.targetType', false)

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
          outputCols={prevOutputCols}
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
                'params.outputCols': nextOutputCols,
                'params.Institution': null
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
            if (!table) {
              return
            }
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

  renderColumnPreviewIndicesTable = () => {
    const { getFieldDecorator, getFieldValue, setFieldsValue } = this.props.form
    let { offlineCalcModels, dispatch, offlineCalcTables, offlineCalcIndices, idxIdDict, location } = this.props
    let currModel = _.get(offlineCalcModels, [0])
  
    let disabled = _.get(location, 'query.targetType', false)
    return (
      <React.Fragment>
        <div
          style={{height: 'calc(100%)'}}
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
              offlineCalcTables={offlineCalcTables}
              showValue="indices"
              idxIdDict={idxIdDict}
              onChange={nextOutputCols => {
                const prevOutputCols = getFieldValue('params.outputCols')
                try {
                  this.detectColCanNotDel(prevOutputCols, nextOutputCols)
                } catch (e) {
                  setTimeout(() => {
                    setFieldsValue({
                      'params.outputCols': prevOutputCols,
                      'params.Institution': null
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
                    'params.diagramInfo': nextDiagramInfo,
                    'params.Institution': null
                  })
                }
              }}
            />
          )}
        </div>
      </React.Fragment>
    )
  }
  
  renderColumnPreviewTable = () => {
    const { getFieldDecorator, getFieldValue, setFieldsValue } = this.props.form
    let { offlineCalcModels, dispatch, tableIdDict, offlineCalcIndices, idxIdDict, location } = this.props
    let currModel = _.get(offlineCalcModels, [0])
  
    let disabled = _.get(location, 'query.targetType', false)
    return (
      <React.Fragment>
        <div
          style={{height: 'calc(100%)'}}
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
              showValue="indicesModel"
              tableIdDict={tableIdDict}
              idxIdDict={idxIdDict}
              onChange={nextOutputCols => {
                const prevOutputCols = getFieldValue('params.outputCols')
                try {
                  this.detectColCanNotDel(prevOutputCols, nextOutputCols)
                } catch (e) {
                  setTimeout(() => {
                    setFieldsValue({
                      'params.outputCols': prevOutputCols,
                      'params.Institution': null
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
                    'params.diagramInfo': nextDiagramInfo,
                    'params.Institution': null
                  })
                }
              }}
            />
          )}
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
      if (!table) {
        return
      }
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

  renderModelPropsConfigurator = (overwriteDom) => {
    let { users, modelTags: tags, offlineCalcModels, location, hiveDataSources, offlineCalcDataSources, tableIdDict } = this.props

    let disabled = _.get(location, 'query.targetType', false)
  
    const { getFieldDecorator, getFieldValue, setFieldsValue } = this.props.form
    let currModel = _.get(offlineCalcModels, [0])
    const  outputTargetType = getFieldValue('params.outputTargetType') 
    const autoGenerate = _.get(currModel, 'tags.0') === 'auto_generate' //智能模型
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
            <Form.Item label="英文名称">
              {getFieldDecorator('name', {
                initialValue: _.get(currModel, 'name'),
                rules: [
                  { required: true, message: '未输入指标模型英文名', whitespace: true },
                  { max: 32, message: '名称太长' },
                  { pattern: /^[a-z_]\w+$/i, message: '只能输入英文字母、下划线和数字，首字符不能为数字' }
                ]
              })(<Input disabled={disabled}/>)}
            </Form.Item>

            <Form.Item label="别名">
              {getFieldDecorator('title', {
                initialValue: _.get(currModel, 'title'),
                rules: [
                  { max: 11, message: '名称太长' },
                  { required: false, message: '不能只有空格', whitespace: true }
                ]
              })(<Input disabled={disabled}/>)}
            </Form.Item>

            <Form.Item
              label="所属分组"
            >
              {getFieldDecorator('tags', {
                initialValue: _.get(currModel, 'tags')
              })(
                <Select
                  mode="multiple"
                  disabled={disabled || autoGenerate}
                  // style={{ width: '100%' }}
                >
                  {
                    autoGenerate
                      ? [<Option key="auto_generate" value="auto_generate">智能分组</Option>]
                      : (tags || []).map(tag => {
                        return (
                          <Option key={tag.id} value={tag.id}>{tag.name}</Option>
                        )
                      })
                  }
                </Select>
              )}
            </Form.Item>

            <Form.Item
              label="机构维度"
            >
              {getFieldDecorator('params.Institution', {
                initialValue: _.get(currModel, 'params.Institution') || []
              })(
                this.renderInstitutionsSelect()
              )}
            </Form.Item>

            <Form.Item
              label="责任部门"
            >
              {getFieldDecorator('params.supervisorDepartments', {
                initialValue: _.get(currModel, 'params.supervisorDepartments') || []
              })(
                <DepartmentPicker disabled={disabled} style={{width: '100%'}} multiple={false} />
              )}
            </Form.Item>

            <Form.Item label="责任人" >
              {getFieldDecorator('supervisor_id', {
                initialValue: _.get(currModel, 'supervisor_id', _.get(window.sugo, 'user.id'))
              })(
                <Select
                  allowClear
                  disabled={disabled}
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
            
            {/* <Form.Item label="模型表名">
              {getFieldDecorator('params.visualModelName', {
                initialValue: _.get(currModel, 'params.visualModelName') || 'dm_',
                rules: [
                  { required: true, message: '未输入模型表名', whitespace: true },
                  { max: 32, message: '名称太长' },
                  { min: 4, message: '名称太短' },
                  { pattern: /^dm_\w*$/i, message: '只能输入英文字母、下划线和数字，必须以“dm_”开头' }
                ]
              })(<Input disabled={disabled}/>)}
            </Form.Item> */}
  
            <Form.Item label="模型表存储库">
              {getFieldDecorator('params.hiveDbName', {
                initialValue: _.get(currModel, 'params.hiveDbName') || 'default',
                rules: []
              })(
                <Select
                  {...enableSelectSearch}
                >
                  {(hiveDataSources || []).map(ds => {
                    return (
                      <Option key={ds.name}>{ds.name}</Option>
                    )
                  })}
                </Select>
              )}
            </Form.Item>
  
            <Form.Item label="输出类型" >
              {getFieldDecorator('params.calcType', {
                initialValue: _.get(currModel, 'params.calcType') || VisualModelCalcTypeEnum.Select,
                rules: [
                  // 没有选指标时不能选择统计汇总
                  {
                    validator(type, value, callback) {
                      if (getFieldValue('params.calcType') === VisualModelCalcTypeEnum.Select) {
                        callback([])
                        return
                      }
                      let outputCols = getFieldValue('params.outputCols')
                      if (!_.some(outputCols, oc => oc.idxId)) {
                        callback([new Error('没有选指标时不能选择统计汇总')])
                        return
                      }
                      callback([])
                    }
                  }
                ]
              })(
                <Select
                  onChange={nextCalcType => {
                    // 为了给用户重新决定是否排除某些列的机会，重置 omitInGroupByMode
                    if (nextCalcType === VisualModelCalcTypeEnum.Select) {
                      let outputCols = getFieldValue('params.outputCols')
                      setFieldsValue({
                        'params.outputCols': _.map(outputCols, oc => _.omit(oc, 'omitInGroupByMode')),
                        'params.Institution': null
                      })
                    }
                  }}
                >
                  {_.keys(VisualModelCalcTypeEnum).map(k => {
                    return (
                      <Option key={k} value={k}>{VisualModelCalcTypeTranslation[k]}</Option>
                    )
                  })}
                </Select>
              )}
            </Form.Item>
  
            <Form.Item label="指标落地到">
              {getFieldDecorator('params.outputTargetType', {
                initialValue: _.get(currModel, 'params.outputTargetType') || ''
              })(
                <Select>
                  {_.keys(OfflineCalcDataSourceTypeEnum).map(k => {
                    return (
                      <Option key={OfflineCalcDataSourceTypeEnum[k]} value={OfflineCalcDataSourceTypeEnum[k]}>{k}</Option>
                    )
                  })}
                </Select>
              )}
            </Form.Item>

            {
              outputTargetType
                ? this.renderMySQLTablePicker(outputTargetType)
                : null
            }
            
            <Form.Item label="主时间列">
              <Select
                {...enableSelectSearch}
                notFoundContent="没有输出时间维度"
                placeholder="未选择"
                value={_(getFieldValue('params.outputCols') || [])
                  .chain()
                  .find(oc => oc.isMainTimeDim)
                  .get('dimId')
                  .value()}
                onChange={val => {
                  let prevOutputCols = getFieldValue('params.outputCols') || []
                  setFieldsValue({
                    'params.Institution': null,
                    'params.outputCols': _.map(prevOutputCols, oc => {
                      return oc.dimId
                        ? oc.dimId === val
                          ? {...oc, isMainTimeDim: true}
                          : _.omit(oc, 'isMainTimeDim')
                        : oc
                    })
                  })
                }}
              >
                {(getFieldValue('params.outputCols') || []).map(oc => {
                  let {dimId, renameTo} = oc
                  if (!dimId) {
                    return null
                  }
                  const [ tableId, fieldName ] = oc.dimId.split('/')
                  let type = oc.castTo
                  if (!type) {
                    let field = _.find(_.get(tableIdDict[tableId], 'params.fieldInfos') || [], f => f.field === fieldName)
                    type = _.capitalize(guessDruidStrTypeByDbDataType(field && field.type))
                  }
                  if (type !== 'Date') {
                    return null
                  }
                  
                  return (
                    <Option key={dimId} >{renameTo || fieldName}</Option>
                  )
                }).filter(_.identity)}
              </Select>
            </Form.Item>

            <Form.Item label="业务口径">
              {getFieldDecorator('description', {
                initialValue: _.get(currModel, 'description')
              })(<Input disabled={disabled} />)}
            </Form.Item>

            <Form.Item
              label={(
                <span>
                  生效时间&nbsp;
                  <Tooltip title="指标模型的生效时间，长期有效/具体的时间段，如果超出了生效时间，则不再计算该指标模型.">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </span>
              )}
            >

              {getFieldDecorator('params.lifeCycle', {
                initialValue: _.get(currModel, 'params.lifeCycle'),
                rules: [
                  {
                    type: 'array',
                    validator(type, value, cb) {
                      let r = _.every(value, v => moment(v, 'YYYY-MM-DD').isValid())
                        ? []
                        : [ new Error('请选择指标模型过期时间') ]
                      cb(r)
                    }
                  }
                ]
              }) (
                <LifeCycleEditor disabled={disabled} className="mg2t" />
              )}
            </Form.Item>

            <Form.Item
              label="调度策略"
            >
              {getFieldDecorator('params.scheduleCron', {
                initialValue: _.get(currModel, 'params.scheduleCron')
              })(
                <OptionalWrapper
                  initialValue={initialCronVal}
                  ctrlComponent={CronPicker}
                  disabled={disabled}
                  className="mg2t"
                />
              )}
            </Form.Item>

            <Form.Item
              label="清理策略"
            >
              {getFieldDecorator('params.cleanCron', {
                initialValue: _.get(currModel, 'params.cleanCron')
              })(
                <OptionalWrapper
                  initialValue={initialCronVal}
                  ctrlComponent={CronPicker}
                  disabled={disabled}
                  className="mg2t"
                />
              )}
            </Form.Item>

            <Form.Item
              label="归档策略"
            >
              {getFieldDecorator('params.archiveCron', {
                initialValue: _.get(currModel, 'params.archiveCron')
              })(
                <OptionalWrapper
                  initialValue={initialCronVal}
                  ctrlComponent={CronPicker}
                  disabled={disabled}
                  className="mg2t"
                />
              )}
            </Form.Item>
            
            {this.renderExtraArgsConfigPanel()}
          </Form>
        </div>
      </React.Fragment>
    );
  }
  
  renderExtraArgsConfigPanel = () => {
    let { offlineCalcModels } = this.props
    const { getFieldDecorator } = this.props.form
    let currModel = _.get(offlineCalcModels, [0])
    
    let defaultPrefix = `
-- for debug: 使用本地跑作业，不用去申请spark资源（需要1分钟左右）
${isDevEnv ? '' : '-- '}set mapreduce.framework.name = local;
${isDevEnv ? '' : '-- '}set hive.execution.engine=mr;
set hive.exec.compress.output=false;
`
    return (
      <Form.Item label="Hive 额外前置配置">
        {getFieldDecorator('params.hivePrefixSettings', {
          initialValue: _.get(currModel, 'params.hivePrefixSettings') || defaultPrefix,
          rules: []
        })(<Input.TextArea placeholder="set xxx;" autosize />)}
      </Form.Item>
    )
  }
  
  renderPropsConfigurator = () => {
    let { users, modelTags: tags, offlineCalcModels, tableIdDict, location } = this.props
    const { getFieldDecorator, getFieldValue, setFieldsValue } = this.props.form
    let currModel = _.get(offlineCalcModels, [0])

    let disabled = _.get(location, 'query.targetType', false)
  
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
      const allFields = _.get(table.params, 'fieldInfos') || []
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
                        'params.outputCols': nextOutputCols,
                        'params.Institution': null
                      })
                    } catch (e) {
                      message.warn(e.message)
                    }
                  }}
                >
                  {_.uniqBy(allFields, 'field').map(fieldInfo => {
                    const {field, type} = fieldInfo || {}
                    return (
                      <Option
                        key={field}
                        value={field}
                      >{field}</Option>
                    )
                  })}
                </Select>
                <a
                  className="pointer"
                  onClick={() => {
                    let nextDiagramInfo = immutateUpdate(diagramInfo, 'tables', tables => {
                      return tables.map(t => {
                        return t.id !== selectedDiagramKey
                          ? t
                          : { ...t, fields: allFields }
                      })
                    })
                    // 选择字段时更新 outputCols
                    // dimId: tableId/fieldName
                    let prevOutputCols = getFieldValue('params.outputCols')
      
                    let allDimIdsInTable = allFields.map(f => `${selectedDiagramKey}/${f.field}`)
                    let willAddDimIds = _.difference(allDimIdsInTable, prevOutputCols.map(oc => oc.dimId).filter(_.identity))
      
                    // [{dimId: 'tableId/field', renameTo: 'xx'}, {idxId: 'xxx', renameTo: 'xxx'}]
                    const nextOutputCols = [...prevOutputCols, ...willAddDimIds.map(dimId => ({dimId}))]
      
                    setFieldsValue({
                      'params.diagramInfo': nextDiagramInfo,
                      'params.outputCols': nextOutputCols
                    })
                  }}
                >全部选中</a>
              </Form.Item>
            </Form>
          </div>
        </React.Fragment>
      )
    }

    return this.renderModelPropsConfigurator(overwriteDom)
  }
  
  resolveAllDimDepsOfIndex = (idx) => {
    if (!idx) {
      return []
    }
    let {dimDeps, idxDeps} = idx.formula_info || {}
    let {idxIdDict} = this.props
    return [...dimDeps, ..._.flatMap(idxDeps, idxId => this.resolveAllDimDepsOfIndex(idxIdDict[idxId]))]
  }
  
  handleDragToRelationChart = ev => {
    let { idxIdDict, tableIdDict, offlineCalcTables, location } = this.props
    const { getFieldDecorator, getFieldValue, setFieldsValue } = this.props.form
    let disabled = _.get(location, 'query.targetType', false)
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
      'params.Institution': null,
      // 更新字段数组
      'params.outputCols': _.uniqBy([...outputCols, ...preAddCols], c => c.dimId || c.idxId)
    })
  }

  renderBread() {
    let { params, location, form } = this.props
    const { getFieldValue } = form
    let targetType = _.get(location, 'query.targetType', 'normal')
  
    const isCreating = _.get(params, 'id') === 'new'
    let breadPath = {
      'normal': [
        { name: '指标模型管理', link: '/console/offline-calc/models' },
        { name: isCreating ? '指标模型创建' : '指标模型编辑' }
      ],
      [OfflineCalcTargetType.IndicesModel]: [
        { name: '指标模型管理', link: '/console/offline-calc/models' },
        { name: '提交审核' }
      ],
      [OfflineCalcTargetType.Reviewer]: [
        { name: '审核管理', link: '/console/offline-calc/review-manager' },
        { name: '发布审核' }
      ],
      [OfflineCalcTargetType.DelReviewer]: [
        { name: '审核管理', link: '/console/offline-calc/review-manager' },
        { name: '删除审核' }
      ],
      'viewVersion': [
        { name: '版本管理', link: '/console/offline-calc/version-manager' },
        { name: '历史版本' }
      ]
    }
    let btnsOverwrite = null
    if (targetType === OfflineCalcTargetType.IndicesModel) {
      btnsOverwrite = (
        <Button type="primary" icon={<SaveOutlined />} onClick={this.onSubmitReview}>提交审核</Button>
      )
    } else if (targetType === OfflineCalcTargetType.Reviewer) {
      btnsOverwrite = (
        <React.Fragment>
          <Button type="primary" icon={<SaveOutlined />} onClick={this.passReview}>通过审核</Button>
          <Button type="primary" icon={<SaveOutlined />} className="mg2l" onClick={this.noPassReview}>不通过审核</Button>
        </React.Fragment>
      )
    } else if (targetType === OfflineCalcTargetType.DelReviewer) {
      btnsOverwrite = (
        <React.Fragment>
          <Button type="primary" icon={<SaveOutlined />} onClick={this.passDelReview}>允许删除</Button>
          <Button type="primary" icon={<SaveOutlined />} className="mg2l" onClick={this.noPassDelReview}>否决删除</Button>
        </React.Fragment>
      )
    } else if (targetType === 'viewVersion') {
      btnsOverwrite = '\u00a0'
    }
  
    return (
      <Bread path={breadPath[targetType]} >
        {btnsOverwrite || (
          <React.Fragment>
            <Button type="primary" icon={<SaveOutlined />} onClick={this.onSubmit}>保存模型</Button>
            <Button
              className="mg2l"
              type="primary"
              icon={<CopyOutlined />}
              onClick={() => {
                let { tableIdDict } = this.props
                try {
                  let sql = this.genSqlExpression()
                  copyTextToClipboard(sql, () => {
                    message.success(`已经复制到剪贴板：${sql}`)
                  }, () => {
                    window.prompt('请按 Ctrl+C 复制:', sql)
                  })
                } catch (e) {
                  message.warn(e.message)
                }
              }}
            >生成SQL</Button>
            {this.renderPublishModelBtn()}
          </React.Fragment>
        )}
      </Bread>
    );
  }

  renderPublishModelBtn = () => {
    let {dsIdDict, tableIdDict, params, idxIdDict, offlineCalcDataSources, hiveDataSources} = this.props
    const { getFieldValue } = this.props.form
    const currIdInUrl = _.get(params, 'id')
    const isCreating = currIdInUrl === 'new'
    const hiveDbName = getFieldValue('params.hiveDbName')
    const outputToDataBase = getFieldValue('params.outputToDataBase')
    const hiveInfo = hiveDataSources.find(p => p.name === hiveDbName)
    if (isCreating) {
      return null
    }
    return (
      <React.Fragment>
        <Button
          className="mg2l"
          type="primary"
          icon={<CaretRightOutlined />}
          onClick={() => {
            try {
              this.genSqlExpression()
            } catch (e) {
              message.warn('生成 SQL 失败，请先确保可以生成 SQL 再发布指标模型')
              return
            }
            this.setState({
              visiblePopoverKey: 'model-publish'
            })
          }}
        >发布模型</Button>
        {this.state.visiblePopoverKey === 'model-publish'
          ? (
            <ModelPublisher
              modelId={currIdInUrl}
              hiveDbName={getFieldValue('params.hiveDbName')}
              modelName={`${getFieldValue('title') || getFieldValue('name')}`}
              depDataSources={_(_.get(getFieldValue('params.diagramInfo'), 'tables') || [])
                .map(t => _.get(tableIdDict, t.id))
                .map(t => t && _.get(dsIdDict, t.data_source_id))
                .uniqBy('id')
                .compact()
                .value()}
              depTables={_(_.get(getFieldValue('params.diagramInfo'), 'tables') || [])
                .map(t => _.get(tableIdDict, t.id))
                .compact()
                .value()}
              joinDimDeps={_(_.get(getFieldValue('params.diagramInfo'), 'joinLinks') || [])
                .flatMap(jl => {
                  let {source, target} = jl
                  let [sTableId, sFieldName] = source.split('/')
                  let [tTableId, tFieldName] = target.split('/')
                  return [{tableId: sTableId, fieldName: sFieldName}, {tableId: tTableId, fieldName: tFieldName}]
                })
                .value()}
              idxIdDict={idxIdDict}
              tableIdDict={tableIdDict}
              outputCols={getFieldValue('params.outputCols')}
              scheduleCron={getFieldValue('params.scheduleCron')}
              outputTargetType={getFieldValue('params.outputTargetType')}
              outputToTable={getFieldValue('params.outputToTable')}
              visualModelName={getFieldValue('params.visualModelName')}
              hiveDataInfo={hiveInfo}
              outputToDataBase={offlineCalcDataSources.find(p => p.id === outputToDataBase)}
              onVisibleChange={() => {
                this.setState({
                  visiblePopoverKey: ''
                })
              }}
              genSqlExpression={this.genSqlExpression}
              institution={getFieldValue('params.Institution')}
              hivePrefixSettings={getFieldValue('params.hivePrefixSettings')}
            />
          )
          : null}
        
      </React.Fragment>
    );
  }

  renderInstitutionsSelect = () => {
    const { tableIdDict, idxIdDict } = this.props
    const { getFieldValue } = this.props.form
    let outputCols = getFieldValue('params.outputCols')

    return (
      <Select
        allowClear
      >
        {
          outputCols.map( i => {
            const { dimId } = i
            if (!dimId) {
              return
              //复合指标是否有string?
              const { idxId } = i
              if (!idxIdDict[idxId]) return
              console.log(idxIdDict[idxId])
              return (
                <Option title={_.get(idxIdDict[idxId],'title') || _.get(idxIdDict[idxId],'name')} key={'insti' + idxId} value={idxId}>{_.get(idxIdDict[idxId],'title') || _.get(idxIdDict[idxId],'name')}</Option>
              )
            }
            const [ id, name ] = dimId.split('/')
            if (!tableIdDict[id]) return
            const { params: { fieldInfos } } = tableIdDict[id]
            if(_.get(_.find(fieldInfos, o => o.field === name), 'type') !== 'STRING') return
            return (
              <Option title={`${_.get(tableIdDict[id],'title') || _.get(tableIdDict[id],'name')}:${name}`} key={'insti' + id + name} value={dimId}>
                <span className="color-grey">{_.get(tableIdDict[id],'title') || _.get(tableIdDict[id],'name')}</span>
                :  {name}
              </Option>
            )
          })
        }
      </Select>
    )
  }
  
  genSqlExpression = (opts = {}) => {
    const { tableIdDict, idxIdDict } = this.props
    const { getFieldValue } = this.props.form
    // let depTables = _(_.get(getFieldValue('params.diagramInfo'), 'tables') || [])
    //   .map(t => _.get(tableIdDict, t.id))
    //   .compact()
    //   .value()
    // let rawTableNameDict = _.zipObject(depTables.map(t => t.name), depTables.map(t => `stg_oc_${t.name}_full_20190810`))
    const filters = getFieldValue('params.filters') || {}
    const tempModel = {
      params: {
        outputCols: getFieldValue('params.outputCols'),
        diagramInfo: getFieldValue('params.diagramInfo'),
        calcType: getFieldValue('params.calcType'),
        offlineModelFilter: filters
      }
    }
    
    return offlineCalcModelToSql(tempModel, {
      tableIdDict,
      idxIdDict,
      ...opts
    })
  }

  renderMySQLTablePicker = (val) => {
    const { getFieldDecorator } = this.props.form
    let { offlineCalcModels, offlineCalcDataSources, offlineCalcTables } = this.props
    // let { selectTables } = this.state
    let currModel = _.get(offlineCalcModels, [0])

    return (
      <React.Fragment>
        <Form.Item label="目标数据库">
          {getFieldDecorator('params.outputToDataBase', {
            initialValue: _.get(currModel, 'params.outputToDataBase'),
            rules: [{ required: true, message: '请填写目标数据库' }]
          })(
            <Select onChange={(v) => {
              const tables = offlineCalcTables.filter(p => p.data_source_id === v)
              this.setState({ selectTables: tables })
              // setFieldsValue({
              //   'params.outputToTable': null
              // })
            }}
            >
              {
                offlineCalcDataSources.map(p => {
                  return p.type === val ? <Option key={p.id} value={p.id}>{p.name}</Option> : null
                })
              }
            </Select>
          )}
        </Form.Item>

        <Form.Item label="目标表">
          {getFieldDecorator('params.outputToTable', {
            initialValue: _.get(currModel, 'params.outputToTable'),
            rules: [{ required: true, message: '请填写目标表' }]
          })(
            // <Select
            //   {...enableSelectSearch}
            // >
            //   {(selectTables || []).map(table => {
            //     return (
            //       <Option key={table.tableName} value={table.tableName}>{table.tableName}</Option>
            //     )
            //   })}
            // </Select>
            <Input/>
          )}
        </Form.Item>
      </React.Fragment>
    )
  }

  render() {
    let { params, offlineCalcModels, tableIdDict } = this.props
    let currModel = _.get(offlineCalcModels, [0])
    const { getFieldDecorator, getFieldValue, setFieldsValue } = this.props.form

    const isCreating = _.get(params, 'id') === 'new'
    if (!isCreating) {
      getFieldDecorator('id', {
        initialValue: _.get(params, 'id')
      })
    }

    const columnPreviewTableDom = this.renderColumnPreviewTable()
    const columnPreviewIndicesDom = this.renderColumnPreviewIndicesTable()
    return (
      <React.Fragment>
        {this.renderBread()}
        {
          <ReleaseModal
            onlyRenderModal
            modalVisible={this.props.modalVisible}
            modalTitle={this.props.modalTitle}
            location={this.props.location}
            params={this.props.params}
          />
        }
        <HorizontalSplitHelper
          style={{height: 'calc(100% - 44px)'}}
          className="contain-docs-analytic"
        >
          <VerticalSplitHelper
            defaultWeight={8}
            className="itblock height-100"
          >
            <div
              defaultWeight={3}
              style={{
                padding: '10px 5px 5px 10px'
              }}
            >
              <div className="bg-white height-100 corner" >
                {this.renderIndicesPicker()}
              </div>
            </div>
            <div
              defaultWeight={2}
              style={{
                padding: '5px 5px 10px 10px'
              }}
            >
              <div className="bg-white height-100 corner" >
                {this.renderTablesPicker()}
              </div>
            </div>
          </VerticalSplitHelper>
          
          <div
            className="itblock height-100"
            style={{padding: '10px 5px 10px 5px'}}
            defaultWeight={40}
          >
            <div
              className="bg-white corner relative"
              style={{height: 'calc(100% - 250px - 10px)'}}
              onDragOver={ev => ev.preventDefault()}
              onDrop={this.handleDragToRelationChart}
            >
              {this.renderJoinConfigDiagram()}
              {!_.isEmpty(_.get(getFieldValue('params.diagramInfo'), 'tables')) ? null : (
                <div className="pd3 color-666 font18 aligncenter absolute top0 width-100 ignore-mouse">
                  请拖拽指标或者维表到这里
                </div>
              )}
            </div>
  
            <div
              className="bg-white corner"
              style={{height: 250, marginTop: '10px'}}
            >
              <Tabs>
                <TabPane tab="数据模型表" key="indices-model">
                  {columnPreviewTableDom}
                </TabPane>
                <TabPane tab="模型指标" key="indices">
                  {columnPreviewIndicesDom}
                </TabPane>
                <TabPane tab="筛选条件" key="filters">
                  <div className="pd2x alignright pd1b"><a onClick={() => this.setState({ showFilterEdit: true })}>编辑</a></div>
                  {
                    getFieldDecorator('params.filters', {
                      initialValue: _.get(currModel, 'params.filters') || [],
                      rules: []
                    })(<DisplayFilterPanel tableIdDict={tableIdDict}/>)
                  }
                  {
                    this.state.showFilterEdit
                      ? <EditFilterModal
                        filters={getFieldValue('params.filters')}
                        value={_.get(currModel, 'params.outputCols', [])}
                        tables={_.get(getFieldValue('params.diagramInfo'),'tables', [])}
                        hideModal={() => this.setState({ showFilterEdit: false })}
                        onChange={(val) => {
                          setTimeout(() => {
                            setFieldsValue({
                              'params.filters': val
                            })
                          }, 100)
                          this.setState({ showFilterEdit: false})
                        }}
                        />
                      : null
                  }
                </TabPane>
              </Tabs>
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
      </React.Fragment>
    )
  }
}
