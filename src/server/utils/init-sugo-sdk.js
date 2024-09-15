/**
 * 初始化自埋点web sdk项目
 */

import ProjectController from '../controllers/project.controller'
import ProjectService from '../services/sugo-project.service'
import { AccessDataType, AccessDataOriginalType, AccessDataTableType } from '../../common/constants'
import conf from '../config'
import { log } from '../utils/log'

const { initSugoSDKProjectName } = conf

export default async function initSugoSDK (company_id, user_id, role_id) {
  
  log('初始化:产品自身埋点项目', initSugoSDKProjectName)

  const session = {
    user: {
      company_id,
      id: user_id,
      SugoRoles: [
        {
          id: role_id
        }
      ],
      company: {
        id: company_id,
        type: 'payed'
      }
    }
  }

  // 创建项目
  const ProjectCreatorCtx = {
    q: {
      name: initSugoSDKProjectName,
      type: AccessDataType.SDK
    },
    session
  }
  const { body: ProjectRes } = await ProjectController.create(ProjectCreatorCtx)
  await ProjectService.update(ProjectRes.result.id, { type: 'built-in' })

  // 创建Web接入分析表
  const WebSDKCreatorCtx = {
    q: {
      name: 'Web',
      type: AccessDataTableType.Main,
      access_type: AccessDataOriginalType.Web,
      project_id: ProjectRes.result.id
    },
    session
  }
  const { body: DataAnalysisRes } = await ProjectCreatorCtx.accessDataSource(WebSDKCreatorCtx)
  log('产品自身埋点项目分析表ID:[%s]', DataAnalysisRes.result.id)
  log('初始化完成:产品自身埋点项目', initSugoSDKProjectName)
}
