import React from 'react'
import { Table, Select, Button, message } from 'antd'
import Fetch from '../../common/fetch-final'
import setStatePromise from '../../common/set-state-promise'
import Bread from '../Common/bread'
import TimePicker from '../Common/time-picker'
import { convertDateType, isRelative } from '../../../common/param-transform'
import { AccessDataOriginalType } from '../../../common/constants'
import Loading from '../Common/loading'
import _ from 'lodash'
import moment from 'moment'

const Option = Select.Option

@setStatePromise
class CustomMadeReportForm extends React.Component {

  state = {
    metricObjs: [],
    data: [{
      androidTurnOnPerPeople: '--',
      androidmonthRetention: '--%',
      count_date: '',
      iOSTurnOnPerPeople: '--',
      iOSmonthRetention: '--%',
      monthLiveness: '--',
      sum_android_month_active: '--',
      sum_android_turnon: '--',
      sum_android_week_active: '--',
      sum_ios_month_active: '--',
      sum_ios_turnon: '--',
      sum_ios_week_active: '--',
      sum_month_active: '--',
      sum_register: '--',
      sum_turnon: '--',
      sum_week_active: '--',
      weekLiveness: '--%'
    }],
    druid_results: [],
    currentPage: 1,
    pageSize: 10,
    loading: false,
    canSearch: false,
    datasource_id: '',
    sdk_type: '',
    app_version: '',
    timeRange: '-7 day',
    page: 1,
    pageSize: 10,
    total: 0,
    sdk_type_option: [{name: '不限', value: ''}],
    app_version_option: [''],
    datasource_id_option: [],
    app_id: []
  }

  componentDidMount() {
    // this.getProjectId()
    // this.props.dispatch({
    //   type: `${namespace}/createDatasourceListAsync`
    // })
  }

  componentWillReceiveProps(nextProps) {
  }

  // getProjectId = async () => {
  //   let res = await Fetch.get('/app/project/list')
  //   const { result: { model } } = res
  //   this.
  //   this.setStatePromise({model})
  //   this.queryDruid()
  // }

  async getData() {
    const { datasource_id, sdk_type, app_version, canSearch, timeRange, page, pageSize, loading } = this.state
    if (!datasource_id) return  message.error('请先选择电视台')
    if (!canSearch) {
      if (datasource_id) return message.error('该电视台没有接入sdk项目')
      return 
    }
    let relativeTime = isRelative(timeRange) ? timeRange : 'custom'
    let [since, until] = relativeTime === 'custom' ? timeRange : convertDateType(relativeTime)
    if (moment.duration(moment(until).diff(since)).asDays() > 90) return message.error('时间范围请小于90天')
    await this.setStatePromise({loading: true})
    const res = await Fetch.get('/app/cutv-report/list',{
      datasource_id,
      sdk_type,
      app_version,
      timeRange: [since, until],
      page,
      pageSize
    })
    let data = _.get(res,'result.sum')
    let total = _.get(res,'result.total')
    this.setState({data, total, loading: false})

  }

  async reset() {
    await this.setStatePromise({
      app_id: [],
      app_version_option: [''],
      sdk_type_option: [{name: '不限', value: ''}],
      sdk_type: '',
      app_version:'',
      datasource_id: ''
    })
  }

  async handleSelectDatasource(datasource_id) {
    await this.reset()
    if (!datasource_id) return
    const { projectList } = this.props
    const { sdk_type_option } = this.state
    const project_id_set = projectList.filter( i => i.datasource_id === datasource_id)
    const res = await Fetch.get('/app/project/appid-list',{
      where: {
        $or: [{
          project_id: project_id_set[0].id,
          access_type: AccessDataOriginalType.Android
        },{
          project_id: project_id_set[0].id,
          access_type:AccessDataOriginalType.Ios
        }]
      }
    })
    if (_.isEmpty(res.result.model)) {
      await this.setStatePromise({
        canSearch: false,
        datasource_id
      })
      return message.error('该电视台项目没有接入sdk')
    }

    const app_id = res.result.model.map(i => ({
      id: i.id,
      access_type: i.access_type
    }))

    await this.setStatePromise({
      datasource_id,
      app_id,
      canSearch: true,
      sdk_type_option: [{name: '不限', value: ''}, {name: 'Android', value: 0}, {name: 'IOS', value: 1}]
    })
  }

  async handleSelectSdkType(sdk_type) {
    const { app_id } = this.state
    if (sdk_type === '') {
      return await this.setStatePromise({
        app_version_option: [''],
        sdk_type: '',
        app_version: ''
      })
    }
    const appid = app_id.filter( i => i.access_type === sdk_type)
    const res = await Fetch.get('/app/sdk/app-version/list-with-events-count',{
      token: appid[0].id
    })
    if (res) {
      const app_version_option = (res.result.app_versions || []).map(i => i.app_version).filter(i => i)
      app_version_option.unshift('')
      await this.setStatePromise({
        app_version_option: app_version_option,
        sdk_type: sdk_type,
        app_version: ''
      })
    }
    
  }

  async changePagination (page, pageSize) {
    await this.setState({page: page,pageSize})
    await this.getData()
  }

  renderFilter() {
    const { projectList } = this.props
    const { datasource_id_option, sdk_type_option, app_version_option, loading, sdk_type, datasource_id, app_version, timeRange } = this.state

    let relativeTime = isRelative(timeRange) ? timeRange : 'custom'
    let [since, until] = relativeTime === 'custom' ? timeRange : convertDateType(relativeTime)
    return (
      <div>
        <span>时间:</span>
        <TimePicker
          className="width120 mg2r"
          style={{marginBottom: '4px'}}
          dateType={relativeTime}
          dateRange={[since, until].map(str => moment(str).format('YYYY-MM-DD HH:mm:ss'))}
          // getPopupContainer={getPopupContainer}
          onChange={async ({ dateType: relativeTime, dateRange: [since, until] }) => {
            if (moment.duration(moment(until).diff(since)).asDays() > 90) message.error('时间范围请小于90天')
            await this.setStatePromise({
              timeRange: relativeTime === 'custom' ? [since, until] : relativeTime
            })
          }}
        />
        <span>电视台:</span>
        <Select
          showSearch
          style={{ width: 100 }}
          placeholder="选择电视台"
          filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
          onChange={async datasource_id => {
            await this.handleSelectDatasource(datasource_id)
          }}
        >
          {
            projectList.filter(i => i.access_type === 1).map((i, idx) => (
              <Option key={`${idx}-${i.datasource_id}`} value={i.datasource_id}>{i.name}</Option>
            ))
          }
        </Select>
        <span className="mg2l">操作系统:</span>
        <Select 
          style={{ width: 100 }}
          showSearch
          placeholder="选择操作系统"
          defaultValue=""
          value={sdk_type}
          filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
          onChange={async sdk_type => {
            await this.handleSelectSdkType(sdk_type)
          }}
        >
          {
            sdk_type_option.map( (i,idx) => (
              <Option key={`${idx}-${i.name}`} value={i.value}>{ i.name }</Option>
            ))
          }
        </Select>
        <span className="mg2l">app版本:</span>
        <Select
          style={{ width: 100 }}
          showSearch
          placeholder="选择版本"
          defaultValue=""
          value={app_version}
          filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
          onChange={async app_version => {
            await this.setState({app_version})
          }}
        >
          {
            app_version_option.map((i, idx) => (
              <Option key={`${idx}-${i}`} value={i}>{i ? i : '不限'}</Option>
            ))
          }
        </Select>
        <Button type="primary" onClick={async ()=> {
          await this.setStatePromise({page:1,pageSize:10})
          await this.getData()
        }} className="mg2l"
        >查询</Button>
      </div>
    )
  }


  render() {
    const { loading, data, page, pageSize, total } = this.state
    const columns = [{
      title: '统计日期',
      dataIndex: 'count_date',
      key: 'count_date',
      fixed:'left',
      render: (text) => text ? moment(text).format('YYYY-MM-DD') : '--'
    }, {
      title: '累计启动',
      dataIndex: 'sum_turnon',
      key: 'sum_turnon'
    }, {
      title: '注册用户',
      dataIndex: 'sum_register',
      key: 'sum_register'
    }, {
      title: '周活跃用户',
      dataIndex: 'sum_week_active',
      key: 'sum_week_active'
    }, {
      title: '周活跃度',
      dataIndex: 'weekLiveness',
      key: 'weekLiveness'
    }, {
      title: '月活跃用户',
      dataIndex: 'sum_month_active',
      key: 'sum_month_active'
    }, {
      title: '月活跃度',
      dataIndex: 'monthLiveness',
      key: 'monthLiveness'
    }, {
      title: '安卓启动用户',
      dataIndex: 'sum_android_turnon',
      key: 'sum_android_turnon'
    }, {
      title: '安卓周活跃用户',
      dataIndex: 'sum_android_week_active',
      key: 'sum_android_week_active'
    }, {
      title: '安卓月活跃用户',
      dataIndex: 'sum_android_month_active',
      key: 'sum_android_month_active'
    }, {
      title: '安卓月留存率',
      dataIndex: 'androidmonthRetention',
      key: 'androidmonthRetention'
    }, {
      title: '安卓人均日启动次数',
      dataIndex: 'androidTurnOnPerPeople',
      key: 'androidTurnOnPerPeople'
    }, {
      title: 'iOS启动用户',
      dataIndex: 'sum_ios_turnon',
      key: 'sum_ios_turnon'
    }, {
      title: 'iOS周活跃用户',
      dataIndex: 'sum_ios_week_active',
      key: 'sum_ios_week_active'
    }, {
      title: 'iOS月活跃用户',
      dataIndex: 'sum_ios_month_active',
      key: 'sum_ios_month_active'
    }, {
      title: 'iOS月留存率',
      dataIndex: 'iOSmonthRetention',
      key: 'iOSmonthRetention'
    }, {
      title: 'iOS人均日启动次数',
      dataIndex: 'iOSTurnOnPerPeople',
      key: 'iOSTurnOnPerPeople'
    }]

    return (
      <div className="height-100">
        <Bread className="bg-grey-f5" path={[{ name: '定制报表' }]}/>
        <div className="mg3x mg3y">
          {this.renderFilter()}
          <div className="mg2y">
            <div style={{width: '100%'}}>
              <Table 
                columns={columns} 
                dataSource={data}
                scroll={{ x: '2000px'}}
                loading={loading}
                rowKey="count_date"
                pagination={{
                  current: page,
                  pageSize,
                  total: ~~total,
                  showTotal: (total, range) => `共${total}条`,
                  onChange:(page, pageSize) => this.changePagination(page,pageSize)
                }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default CustomMadeReportForm
