import React,{useState} from 'react'
import { Form, Input, Drawer, Tabs, Button,Modal } from 'antd'
import ReactEcharts from 'echarts-for-react'
import _ from 'lodash'
import moment from 'moment'
import { TEMP_METRIC } from 'client/common/sdk-calc-point-position'
import './index.styl'

const { TextArea } = Input
const { TabPane } = Tabs

const EventEdit = (props) => {

  const { info, changeState, saveEvent, showEventInfo, screenshot } = props
  const { screenshot_id, event_path_type} = info
  const [screenShotShowUrl,setScreenShotShowUrl]=useState('')
  const [form] = Form.useForm()
  const [form2] = Form.useForm()
  form.setFieldsValue(info)
  form2.setFieldsValue({
    created_on: moment(info.created_on).format('YYYY-MM-DD HH:mm:ss'),
    updated_on: moment(info.updated_on).format('YYYY-MM-DD HH:mm:ss'),
    app_version: 1
  })

  let eventData = _.get(info, 'eventData', [])
  // 补充数据显示
  if (eventData.length < 7) {
    const eventDataMap = _.reduce(eventData, (r, v) => {
      r[moment(v['__time']).format('YYYY-MM-DD')] = v[TEMP_METRIC]
      return r
    }, {})
    eventData = _.map(Array(7), (p, idx) => {
      const date = moment().add(idx - 7 + 1, 'd').format('YYYY-MM-DD')
      return { __time: date, [TEMP_METRIC]: _.get(eventDataMap, [date], 0) }
    })
  }
  const xAxisData = eventData.map(p => {
    return moment(p.__time).format('MM/DD dddd')
  })
  function showImageRender(){
    console.log(screenShotShowUrl)
    return(
      <Modal
        width={'90vw'}
        height={'90vh'}
        bodyStyle={{paddingLeft:0,paddingRight:0,overflow:'scroll',height:'80vh',width:'90vw',textAlign:'center'}}
        visible={screenShotShowUrl!==''}
        closable={false}
        onOk={()=>setScreenShotShowUrl('')}
        onCancel={()=>setScreenShotShowUrl('')}
      >
        <img className="screenImage" src={screenShotShowUrl}/>
      </Modal>)
  }
  const seriesData = eventData.map(p => {
    return p[TEMP_METRIC]
  })

  return (
    <Drawer
      className="edit_event"
      width={520}
      onClose={() => changeState({ showEventInfo: false })}
      visible={showEventInfo}
      bodyStyle={{ paddingBottom: 80 }}
      footer={
        <div className="alignright" >
          <Button className="mg2r" onClick={() => changeState({ showEventInfo: false })} style={{ marginRight: 8 }}>
            关闭
          </Button>
          <Button
            onClick={() => {
              form.validateFields().then(val => saveEvent(val))
            }}
            type="primary"
          >
            提交
          </Button>
        </div>
      }
    >
      <Tabs>
        <TabPane tab="基本信息" key="1">
          <Form
            form={form}
            labelAlign="left"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 18 }}
          >
            <Form.Item
              name="event_name"
              label="事件名称"
              rules={[{ required: true, message: '事件名称必填' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item name="sugo_autotrack_page_path" label="页面" >
              <Input disabled />
            </Form.Item>
            <Form.Item name="sugo_autotrack_content" label="文本">
              <Input disabled />
            </Form.Item>
            <Form.Item name="sugo_autotrack_position" label="位置">
              <Input disabled />
            </Form.Item>
            <Form.Item name="event_memo" label="描述">
              <TextArea rows="5" placeholder="填写事件的触发时机和应用场景" maxLength="46" />
            </Form.Item>
          </Form>
          <div className="mg2 font16">统计趋势</div>
          <ReactEcharts
            option={{
              border: 1,
              tooltip: {
                trigger: 'axis'
              },
              grid: {
                top: '40',
                left: '40',
                right: '40',
                bottom: '0',
                containLabel: true
              },
              xAxis: {
                type: 'category',
                boundaryGap: false,
                data: xAxisData
              },
              yAxis: {
                type: 'value',
                splitNumber: 2,
                minInterval: 1
              },
              series: [
                {
                  name: '总量',
                  type: 'line',
                  stack: '总量',
                  data: seriesData
                }
              ]
            }}
          />
          <div className="mg2 font16">截图</div>
          {/* web端的截屏是从文件服务器的获取，其他的是从数据库读取base64的 */}
          {
            event_path_type !== 'web' ?
              <img 
                style={{cursor:'pointer'}} 
                onClick={() => setScreenShotShowUrl(`data:image/png;base64,${screenshot}`)}
                className="border width-100"
                src={`data:image/png;base64,${screenshot}`}
              />
              : <img style={{cursor:'pointer'}}
                onClick={() => setScreenShotShowUrl(`/api/uploaded-files/get-file/f/${screenshot_id}`)}
                className="border width-100" 
                src={`/api/uploaded-files/get-file/f/${screenshot_id}`}
              />
          }
        </TabPane>
        <TabPane tab="其他信息" key="2">
          <Form
            form={form2}
            labelAlign="left"
            labelCol={{ span: 4 }}
            wrapperCol={{ span: 18 }}
          >
            <Form.Item name="created_on" label="创建时间">
              <Input disabled />
            </Form.Item>
            <Form.Item name="updated_on" label="最后更新时间">
              <Input disabled />
            </Form.Item>
            <Form.Item name="app_version" label="app版本">
              <Input disabled />
            </Form.Item>
          </Form>
        </TabPane>
      </Tabs>
      {showImageRender()}
    </Drawer>
  )
}

export default EventEdit
