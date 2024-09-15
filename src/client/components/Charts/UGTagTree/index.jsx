import { Component } from 'react'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'
import * as actions from 'client/actions'
import TagTypeTree from '../../Datasource/tag-system-manager/tag-type-tree'
import { getCurrentTagProject } from '../../../common/tag-current-project'
import Store from '../../Datasource/tag-system-manager/store'


let mapStateToProps = state => state.common
let mapDispatchToProps = dispatch => bindActionCreators(actions, dispatch)


@connect(mapStateToProps, mapDispatchToProps)
class UGTagTree extends Component {

  constructor(props, context) {
    super(props, context)
    this.store = new Store()
    this.store.subscribe(state => this.setState(state))
    this.state = this.store.getState()
  }

  componentDidMount() {
    this.props.getProjects()
    this.props.getDatasources()
    this.props.getRoles()
    this.props.getUsers()
    this.props.getTagGroups()
    // this.init(this.props)
  }

  componentWillReceiveProps(nextProps) {
      let {projectCurrent, datasourceCurrent, tagProject, tagDatasource, tagGroups} = this.props
  }

  render() {
    let { projects, datasources } = this.props
    const { dimensionList, treeData } = this.state.vm
    return <div>test</div>
    let { tagProject, tagDatasource } = getCurrentTagProject(projects, {
      "id": "E0tWndycfV",
      "name": "标签测试",
      "datasource_id": "g5R4a6ae4T",
      "datasource_name": "uindex_SJLnjowGe_project_Ee43IMEAt",
      "tag_datasource_name": "uindex_SJLnjowGe_project_Ee43IMEAt",
      "company_id": "SJLnjowGe",
      "status": 1,
      "state": 0,
      "access_type": 3,
      "type": "user-created",
      "created_by": "BJZ83jiwGg",
      "updated_by": "BJZ83jiwGg",
      "from_datasource": 0,
      "reference_tag_name": null,
      "real_user_table": null,
      "ignore_sync_dimension": [
        "s_xxxx",
        "s_xxx",
        "s_asd",
        "s_ss",
        "s_ssss",
        "s_sss",
        "s_weibo",
        "s_test",
        "s_test1",
        "s_sunny_test",
        "f_sunny_test1",
        "f_sunny_test",
        "s_gfh",
        "s_dasdsa",
        "s_asdsa",
        "s_dsad",
        "i_i_capacity_with_water",
        "p_p_store_area",
        "i_i_capacity_without_water",
        "s_capacity_with_water",
        "distinct_id"
      ],
      "extra_params": {},
      "created_at": "2018-09-19T09:58:45.167Z",
      "updated_at": "2019-08-15T06:45:38.602Z"
    }, datasources = [], {
      "id": "g5R4a6ae4T",
      "name": "uindex_SJLnjowGe_project_Ee43IMEAt",
      "tag_datasource_name": "uindex_SJLnjowGe_project_Ee43IMEAt",
      "title": "标签测试",
      "description": null,
      "status": 1,
      "peak": "0",
      "type": 2,
      "taskId": null,
      "tag_task_id": "uindex_SJLnjowGe_project_Ee43IMEAt",
      "params": {
        "commonMetric": [
          "distinct_id"
        ],
        "commonMicroPicture": [
          "distinct_id",
          "s_wechat",
          "s_phone"
        ],
        "microPictureBaseInfo": [
          "s_member_name",
          "s_phone",
          "s_email",
          "s_weibo",
          "s_sex"
        ]
      },
      "supervisorPath": null,
      "supervisorJson": {},
      "user_ids": [],
      "role_ids": [
        "S1x83jjDfl",
        "ryGc5a5JG",
        "ryyhdGy_Z",
        "SyZDT7hRe",
        "B1_NJ24Rg",
        "HkEaI8dv-"
      ],
      "created_by": "BJZ83jiwGg",
      "updated_by": "BJZ83jiwGg",
      "company_id": "SJLnjowGe",
      "access_type": "single",
      "createdAt": "2018-09-19T09:58:44.985Z",
      "updatedAt": "2019-03-13T02:26:55.780Z"
    })


    // console.log(tagProject,'===')
    // console.log(tagDatasource)
    // return (
    //   <TagTypeTree
    //     project={tagProject}
    //     datasource={tagDatasource}
    //     expandedKeys={[]}
    //     selectedKeys={[]}
    //     defaultExpandedKeys={[]}
    //     defaultSelectedKeys={[]}
    //     setState={() => {}}
    //     treeData={[]}
    //     saveOrder={() => {}}
    //     treeContainer={() => {}}
    //     onSelect={() => {}}
    //     tagGroups={[]}
    //   />
    // );
  }
}

export default UGTagTree;