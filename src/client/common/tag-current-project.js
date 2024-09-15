
import { AccessDataType } from '../../common/constants'

export const getCurrentTagProject = function (projectList, projectCurrent, datasourceList = [], datasourceCurrent = {}) {
  if (projectCurrent.access_type !== AccessDataType.Tag && projectCurrent.tag_datasource_name) {
    const tagProject = projectList.find(p => p.tag_datasource_name === projectCurrent.tag_datasource_name && p.access_type === AccessDataType.Tag) || {}
    const tagDatasource = datasourceList.length ? datasourceList.find(p => p.id === tagProject.datasource_id) : {}
    return { tagProject, tagDatasource }
  }
  return {
    tagProject: projectCurrent,
    tagDatasource: datasourceCurrent
  }
}
