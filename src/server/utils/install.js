/**
 * @Author sugo.io<asd>
 * @Date 17-11-9
 * @description 扩展模块
 * @link https://github.com/Datafruit/sugo-analytics/issues/4743
 */

import Router from 'koa-router'
import server from 'koa-static'
import mount from 'koa-mount'
import logger from './logger'
import {join, resolve} from 'path'
import generate from 'shortid'

const ControllerPath = resolve(__dirname, '../controllers')
const ServicePath = resolve(__dirname, '../services')

/**
 * 内建模块，包括服务与controller
 * @type {Object}
 */
const BuildInModulesMap = {
  // controllers
  BatchDownloadController: join(ControllerPath, 'batch-download.controller.js'),
  BehaviorAnalyticsController: join(ControllerPath, 'behavior-analytics.controller.js'),
  BusinessDbSettingController: join(ControllerPath, 'business-db-setting.controller.js'),
  CaptchaController: join(ControllerPath, 'captcha.controller.js'),
  CompanyController: join(ControllerPath, 'company.controller.js'),
  ContactController: join(ControllerPath, 'contact.controller.js'),
  DashboardsController: join(ControllerPath, 'dashboards.controller.js'),
  GalleryController: join(ControllerPath, 'gallery.controller.js'),
  LivefeedFullscreenController: join(ControllerPath, 'livefeed-fullscreen.controller.js'),
  LogUploadController: join(ControllerPath, 'log-upload.controller.js'),
  LossPredictController: join(ControllerPath, 'loss-predict.controller.js'),
  OverviewController: join(ControllerPath, 'overview.controller.js'),
  PageController: join(ControllerPath, 'page.controller.js'),
  PathAnalysisController: join(ControllerPath, 'path-analysis.controller.js'),
  PioProjectsController: join(ControllerPath, 'pio-projects.controller.js'),
  PioController: join(ControllerPath, 'pio.controller.js'),
  PlyqlController: join(ControllerPath, 'plyql.controller.js'),
  ProjectController: join(ControllerPath, 'project.controller.js'),
  RealUserTableController: join(ControllerPath, 'real-user-table.controller.js'),
  RetentionController: join(ControllerPath, 'retention.controller.js'),
  RfmController: join(ControllerPath, 'rfm.controller.js'),
  RoleController: join(ControllerPath, 'role.controller.js'),
  SceneController: join(ControllerPath, 'scene.controller.js'),
  SegmentExpandController: join(ControllerPath, 'segment-expand.controller.js'),
  SlicesController: join(ControllerPath, 'slices.controller.js'),
  SubscribeController: join(ControllerPath, 'subscribe.controller.js'),
  SugoAlarmInterfaceController: join(ControllerPath, 'sugo-alarm-interface.controller.js'),
  SugoCustomOrdersController: join(ControllerPath, 'sugo-custom-orders.controller.js'),
  SugoDatasourcesController: join(ControllerPath, 'sugo-datasources.controller.js'),
  SugoDesktopController: join(ControllerPath, 'sugo-desktop.controller.js'),
  SugoDimensionsController: join(ControllerPath, 'sugo-dimensions.controller.js'),
  SugoFunnelsController: join(ControllerPath, 'sugo-funnels.controller.js'),
  SugoLivefeedsController: join(ControllerPath, 'sugo-livefeeds.controller.js'),
  SugoLivescreenController: join(ControllerPath, 'sugo-livescreen.controller.js'),
  SugoMeasuresController: join(ControllerPath, 'sugo-measures.controller.js'),
  SugoMonitorAlarmsController: join(ControllerPath, 'sugo-monitor-alarms.controller.js'),
  SugoPivotMarksController: join(ControllerPath, 'sugo-pivot-marks.controller.js'),
  SugoSdkController: join(ControllerPath, 'sugo-sdk.controller.js'),
  SugoTagsController: join(ControllerPath, 'sugo-tags.controller.js'),
  TagAiController: join(ControllerPath, 'tag-ai.controller.js'),
  TagGroupController: join(ControllerPath, 'tag-group.controller.js'),
  TagTypeController: join(ControllerPath, 'tag-type.controller.js'),
  TempLookupsController: join(ControllerPath, 'temp-lookups.controller.js'),
  TrafficAnalyticsController: join(ControllerPath, 'traffic-analytics.controller.js'),
  UploadedFilesController: join(ControllerPath, 'uploaded-files.controller.js'),
  UserGuideReadingStateController: join(ControllerPath, 'user-guide-reading-state.controller.js'),
  UserController: join(ControllerPath, 'user.controller.js'),
  UsergroupsController: join(ControllerPath, 'usergroups.controller.js'),
  UtilsController: join(ControllerPath, 'utils.controller.js'),

  // service
  BaseService: join(ServicePath, 'base.service.js'),
  BehaviorAnalyticModelsService: join(ServicePath, 'behavior-analytic-models.service.js'),
  BusinessDbSettingService: join(ServicePath, 'business-db-setting.service.js'),
  CacheService: join(ServicePath, 'cache.js'),
  CompanyService: join(ServicePath, 'company.service.js'),
  ContactService: join(ServicePath, 'contact.service.js'),
  DesktopService: join(ServicePath, 'desktop.service.js'),
  DruidQueryService: join(ServicePath, 'druid-query.service.js'),
  DruidSupervisorService: join(ServicePath, 'druid-supervisor.service.js'),
  LogUploadService: join(ServicePath, 'log-upload.service.js'),
  LossPredictModelService: join(ServicePath, 'loss-predict-model.service.js'),
  LossPredictPredictionService: join(ServicePath, 'loss-predict-prediction.service.js'),
  PathAnalysisService: join(ServicePath, 'path-analysis.service.js'),
  PioService: join(ServicePath, 'pio.service.js'),
  PublicRedisStorageService: join(ServicePath, 'public-redis-storage.service.js'),
  RealUserTableService: join(ServicePath, 'real-user-table.service.js'),
  RedisService: join(ServicePath, 'redis.service.js'),
  RedisScheduleService: join(ServicePath, 'redis-schedule.service.js'),
  RoleService: join(ServicePath, 'role.service.js'),
  SchedulerJobService: join(ServicePath, 'scheduler-job.service.js'),
  SegmentExpandService: join(ServicePath, 'segment-expand.service.js'),
  SegmentService: join(ServicePath, 'segment.service.js'),
  SlicesService: join(ServicePath, 'slices.service.js'),
  SugoAccessDataTaskService: join(ServicePath, 'sugo-access-data-task.js'),
  SugoAlarmInterfaceService: join(ServicePath, 'sugo-alarm-interface.service.js'),
  SugoAnalysisAssociateService: join(ServicePath, 'sugo-analysis-associate.service.js'),
  SugoAppVersionService: join(ServicePath, 'sugo-app-version.js'),
  SugoCustomOrdersService: join(ServicePath, 'sugo-custom-orders.service.js'),
  SugoDataAnalysisHbaseService: join(ServicePath, 'sugo-data-analysis-hbase.service.js'),
  SugoDataAnalysisService: join(ServicePath, 'sugo-data-analysis.service.js'),
  SugoDatasourceService: join(ServicePath, 'sugo-datasource.service.js'),
  SugoDimensionService: join(ServicePath, 'sugo-dimension.service.js'),
  SugoDimensionsService: join(ServicePath, 'sugo-dimensions.service.js'),
  SugoGalleryService: join(ServicePath, 'sugo-gallery.service.js'),
  SugoLivescreenService: join(ServicePath, 'sugo-livescreen.service.js'),
  SugoMeauresService: join(ServicePath, 'sugo-meaures.service.js'),
  SugoMonitorAlarmsExceptionsService: join(ServicePath, 'sugo-monitor-alarms-exceptions.service.js'),
  SugoMonitorAlarmsService: join(ServicePath, 'sugo-monitor-alarms.service.js'),
  SugoProjectService: join(ServicePath, 'sugo-project.service.js'),
  SugoRoleGalleriesService: join(ServicePath, 'sugo-role-galleries.service.js'),
  SugoSdkPageCategoriesService: join(ServicePath, 'sugo-sdk-page-categories.service.js'),
  SugoSdkPageInfoService: join(ServicePath, 'sugo-sdk-page-info.service.js'),
  SugoTrackEventService: join(ServicePath, 'sugo-track-event.service.js'),
  SugoUserService: join(ServicePath, 'sugo-user.service.js'),
  TagGroupService: join(ServicePath, 'tag-group.service.js'),
  TagTypeService: join(ServicePath, 'tag-type.service.js'),
  TempLookupsService: join(ServicePath, 'temp-lookups.service.js'),
  TopTagService: join(ServicePath, 'top-tag.service.js'),
  TrafficAnalyticModelsService: join(ServicePath, 'traffic-analytic-models.service.js'),
  TrafficService: join(ServicePath, 'traffic.service.js'),
  UploadedFilesService: join(ServicePath, 'uploaded-files.service.js'),
  UserGuideReadingStateService: join(ServicePath, 'user-guide-reading-state.service.js'),
  UsergroupRedisService: join(ServicePath, 'usergroup-redis.service.js')
}

/**
 * 需要扩展到应用的资源
 * @typedef {Object} SugoIOExtensionExtract
 * @property {Array<{path:string, file:string}>} [assets]       - 静态资源文件或目录
 * @property {Koa} [app]       - 返回一个新的koa实例，如果返回了该实例，则表示使用该app代替原有的app
 */

/**
 * @typedef {function} SugoIOExtension
 * @param {Koa} app
 * @param {Router} router
 * @param {Object<string, Sequelize>} database
 * @param {Object} config
 * @param {Object} dependencies
 * @return {Promise<SugoIOExtensionExtract>}
 */

/**
 * TODO 静态资源不可能使用动态的namespace
 *      这会造成服务重启后CDN失效,所有的开放api也会变化
 *      查如果没有namespace,则可能出现路由冲突的问题
 *      所以namespace的设计需要再斟酌
 */


/**
 * @typedef {Object} SugoIOExtensionDesc
 * @property {String} namespace
 * @property {SugoIOExtension} install
 * @property {Object<string, Object>} dependencies
 */

/**
 * @type {Object<string, SugoIOExtensionDesc>}
 */
const Extensions = {}

/**
 * @param {Koa} app
 * @param {Object<string, Sequelize>} database
 * @param {Object} config
 * @param {SugoIOExtensionDesc} extension
 * @return {Promise<Koa>}
 */
async function install(app, database, config, extension) {
  let namespace = extension.namespace

  if (!namespace) {
    logger.warn('extension must have a namespace')
    namespace = generate()
  }

  if (Extensions.hasOwnProperty(namespace)) {
    logger.error('extension\'s namespace was exits')
    return app
  }

  Extensions[namespace] = extension
  logger.info('Install extension: %s', namespace)

  const dependencies = {}
  const deps = extension.dependencies || []

  for (let dep of deps) {
    if (BuildInModulesMap.hasOwnProperty(dep)) {
      dependencies[dep] = require(BuildInModulesMap[dep]).default
    }
  }

  const router = new Router({prefix: '/' + namespace})
  const extract = await extension.install(app, router, database, config, dependencies)
  logger.info('Extension extract: %j', extract)

  if (extract.app) {
    return app
  }

  // 如果有静态资源,则挂载
  if (extract.assets && extract.assets.length > 0) {
    const maxAge = 1000 * 60 * 60 * 24 * 365
    extract.assets.forEach(as => {
      const path = '/' + namespace + as.path
      app.use(mount(path, server(as.file, {maxAge, hidden: true})))
      logger.info('Extension extract assets path: %j. as %j', path, as)
    })
  }

  app.use(router.routes(), router.allowedMethods())

  return app
}

export default install
export {
  install
}
