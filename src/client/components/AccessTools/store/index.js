/**
 * Created by asd on 17-7-17.
 */

import { Store, storeViewModelCreator, storeModelCreator } from 'sugo-store'

import AccessDataTask, { Action as ADTAction } from '../../../models/access-data-task'
import Project, { Action as ProjectAction } from '../../../models/project'
import VM, { Action as VMAction, jobProperties } from './view-model'
import Loading, { Action as LoadingAction } from './loading'

import { getRecord } from '../base/ot-conf'
import _ from 'lodash'
import { browserHistory } from 'react-router'

import { ACCESS_DATA_TASK_STATUS } from '../constants'

/**
 * @param {String} type
 * @param {Object} [payload={}]
 * @return {{type: String, payload: Object}}
 */
function struct (type, payload = {}) {
  return { type, payload }
}

/**
 * @typedef {Object} AccessDataTaskState
 * @property {ProjectStoreModel} Project
 * @property {AccessDataTaskStoreModel} AccessDataTask
 * @property {AccessDataTaskViewModel} vm
 * @property {AccessToolsLoading} Loading
 */

class Creator extends Store {
  constructor () {
    super()
    storeModelCreator([Project, AccessDataTask], this)
    storeViewModelCreator([VM, Loading], this)
    this.initialize()
  }

  /**
   * 查看task列表模式
   * 1. 更新 ProjectModel
   * 2. 请求 AccessDataTask 列表
   * @param {ProjectStoreModel} project
   * @return {Creator}
   */
  initViewListModel (project) {
    this.dispatch(struct(ProjectAction.change, { ...project }))

    this.dispatch(struct(LoadingAction.change, { accessDataTask: true }))
    this.dispatch(
      struct(VMAction.list, { project_id: project.id }),
      state => {
        this.dispatch(struct(LoadingAction.change, { accessDataTask: false }))
        // 如果有一个项目运行成功，就自动同步维度
        // TODO 此处应该在数据库记录一个tag，验证每一个task是否已同步过维度，以免重复同步，造成性能浪费
        if (state.vm.AccessDataTask.some(r => r.status === ACCESS_DATA_TASK_STATUS.SUCCESS)) {
          this.sync()
        }
      }
    )
    return this
  }

  /**
   * 编辑模式
   * 1. 查询记录信息
   * 2. 查询记录的 ProjectModel
   * 3. 渲染 Editor
   * @param {String} id
   * @return {Creator}
   */
  initEditModel (id) {

    // 更新loading状态
    this.dispatch(struct(LoadingAction.change, { accessDataTask: true }))
    // 查询 AccessDataTask 记录
    this.dispatch([
      struct(ADTAction.change, { id }),
      struct(ADTAction.query)
    ], state => {

      // 更新loading状态
      this.dispatch(struct(LoadingAction.change, {
        accessDataTask: false,
        project: true
      }))

      // 查询 AccessDataTask 对应的 ProjectModel
      this.dispatch(
        struct(ProjectAction.query, { id: state.AccessDataTask.project_id }),
        // 更新loading状态
        () => this.dispatch(struct(LoadingAction.change, { project: false }))
      )
    })
    return this
  }

  /**
   * 新建模式
   * @param {String} project_id
   * @return {Creator}
   */
  initCreateModel (project_id) {
    this.dispatch(struct(LoadingAction.change, { project: true }))
    const { Projects } = this.state.vm
    const project = Projects.find(r => r.id === project_id)
    this.dispatch(
      [
        struct(ProjectAction.change, {  ...project }),
        struct(ProjectAction.query, { id: project_id })
      ],
      () => this.dispatch(struct(LoadingAction.change, { project: false }))
    )
    return this
  }

  /**
   * 初始化编辑器
   * @param project
   * @param task
   * @return {Creator}
   */
  initEditor (project, task) {
    this.dispatch(struct(VMAction.projects))
    this.dispatch(struct(ProjectAction.change, { ...project }))
    this.dispatch(struct(ADTAction.change, { ...task }))

    // 编辑
    if (task.id) {
      this.dispatch(struct(LoadingAction.change, { accessDataTask: true }))
      this.dispatch(
        [
          struct(ADTAction.query),
          struct(VMAction.params)
        ],
        () => this.dispatch(struct(LoadingAction.change, { accessDataTask: false }))
      )
    }

    return this
  }

  _setOt (key, value) {
    const record = getRecord(key)
    this.state.vm.ot.set(record.path, value)
    return this
  }

  setProject (id) {
    const { Projects } = this.state.vm
    const project = Projects.find(r => r.id === id)
    this.dispatch(struct(ProjectAction.change, { ...project }))
    this._setOt('dataSource', project.datasource_name)
    return this
  }

  setAccessType (access_type) {
    this.dispatch(struct(VMAction.change, { access_type }))
    return this
  }

  setCsvListDelimiter (csv_separator) {
    this.dispatch(struct(VMAction.change, { csv_separator }))
    return this
  }

  setFile (file) {
    this.dispatch(struct(VMAction.file, { file }))
    return this
  }

  setResourceFileType (resource_file_type) {
    this.dispatch(struct(VMAction.change, { resource_file_type }))
    this._setOt('format', resource_file_type)
    return this
  }

  setFileDir (file_dir) {
    this.dispatch(struct(VMAction.change, { file_dir }))
    this._setOt('paths', file_dir)
    return this
  }

  setDateFormat (dim, format) {
    const { titles } = this.state.vm
    const record = titles.find(r => r.name === dim.name)

    if (!record) {
      return this
    }

    const next = titles.map(t => t.name === record.name ? ({ ...t, format }) : t)

    this._setOt('dimensions', next.map(r => {
      let o = {
        type: r.type,
        name: r.name
      }
      if (r.format) {
        o.format = r.format
      }
      return o
    }))

    this.dispatch(struct(VMAction.change, {
      titles: next
    }))

    return this
  }

  /**
   * 选择hadoop version
   * @param hadoop_version
   * @return {Creator}
   */
  setHadoopVersion (hadoop_version) {
    this.dispatch(struct(VMAction.change, { hadoop_version }))
    return this
  }

  /**
   * 展示代码
   * @param conf
   * @return {Creator}
   */
  showCode (conf) {
    const {
      resource_file_type,
      file_dir,
      ot,
      titles,
      csv_separator,
      hadoop_version
    } = this.state.vm

    const project = this.state.Project

    ot.object = conf

    this._setOt('listDelimiter', csv_separator)
    this._setOt('dataSource', project.datasource_name)
    this._setOt('format', resource_file_type)
    this._setOt('paths', file_dir)
    this._setOt('dimensions', titles.map(r => {
      let o = {
        type: r.type,
        name: r.name
      }
      if (r.format) {
        o.format = r.format
      }
      return o
    }))
    this._setOt('jobProperties', jobProperties(hadoop_version))

    this.dispatch(struct(VMAction.change, { showCode: true }))
    return this
  }

  showEditor () {
    this.dispatch(struct(VMAction.change, { showCode: false }))
    return this
  }

  setOtObject (object) {
    if (!_.isObject(object)) return this
    const { ot } = this.state.vm
    ot.object = object
    this.dispatch(struct(VMAction.change, { ot }))
    return this
  }

  /**
   * 创建并运行task
   */
  createAndRun () {
    const {
      Project: {
        id: project_id,
        datasource_name
      },
      vm: { ot }
    } = this.state

    this.dispatch(
      [
        struct(ADTAction.change, {
          project_id,
          datasource_name,
          params: ot.valueOf()
        }),
        struct(ADTAction.createAndRun)
      ],
      () => {
        browserHistory.push('/console/access-tools?from=create')
      })
  }

  /**
   * 停止task
   * @param {AccessDataTaskStoreModel} model
   * @return {Creator}
   */
  stopOne (model) {
    this.dispatch(struct(VMAction.stopOne, { id: model.id }))
    return this
  }

  /**
   * 运行task
   * @param {AccessDataTaskStoreModel} model
   * @return {Creator}
   */
  runOne (model) {
    this.dispatch(struct(VMAction.runOne, { id: model.id }))
    return this
  }

  /**
   * 下载样例文件
   * @return {Creator}
   */
  download () {
    this.dispatch(struct(VMAction.download))
    return this
  }

  /**
   * 同步维度
   * @return {Creator}
   */
  sync () {
    this.dispatch(struct(LoadingAction.change, { sync: true }))
    this.dispatch(struct(VMAction.sync), () => {
      this.dispatch(struct(LoadingAction.change, { sync: false }))
    })
    return this
  }
}

export default Creator
