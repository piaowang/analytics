/**
 * 检查使用项目管理的前置条件， 如果不符合，提示用户
 */
import check from '../Common/project-requirement'
const {cdn} = window.sugo
const urlBase = `${cdn}/_bc/sugo-analytics-static/assets/images`
import { AccessDataType } from '../../../common/constants'

const notok = ({moduleName}) => {
  return (
    <div
      className="relative"
      style={{height: 'calc(100vh - 200px)'}}
    >
      <div className="center-of-relative aligncenter">
        <p>
          <img src={`${urlBase}/ui-nothing.png`} alt="" className="iblock" />
        </p>
        <div className="pd2t">
          这个项目不是由标签系统创建的，不能使用{moduleName}，请切换到由标签系统创建的项目。
        </div>
      </div>
    </div>
  )
}

let tagRequirementChecker = ({ datasourceCurrent, projectCurrent, moduleName = '此功能' }) => {
  if (AccessDataType.Tag === projectCurrent.tag_datasource_name) {
    return notok({moduleName})
  }
  let datasourceSettingsNeeded = check({
    datasource: datasourceCurrent,
    project: projectCurrent,
    title: moduleName,
    props: ['datasource.params.commonMetric']
  })
  return datasourceSettingsNeeded || null
}
export default tagRequirementChecker
