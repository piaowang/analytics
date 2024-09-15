import React, { useEffect, useState } from 'react'
import propTypes from 'prop-types'
import './livescreen-controltheme-manager.styl'
import { DeleteFilled, DeleteOutlined, EditFilled, EyeFilled, TagFilled } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Input, Table, Button, Popconfirm, InputNumber, Select, message, Tooltip } from 'antd'
import { checkPermission } from '../../common/permission-control'
import {
  deleteLiveScreenTheme,
  saveLiveScreenTheme,
  selectLiveScreenThemeById,
  getLiveScreenThemeList,
  updateLiveScreenTheme
} from '../../services/life-cycle'

const { Search } = Input
import _ from 'lodash'
import Rect from '~/components/common/react-rectangle'
import UploadedImageViewer from '~/components/common/uploaded-image-viewer'

const canCreateTheme = checkPermission(
  'post:/app/live-screen-projection/theme/create'
)

const canViewTheme = checkPermission('get:/app/live-screen-projection/theme')

const canUpdateTheme = checkPermission(
  'post:/app/live-screen-projection/theme/update'
)

const canDeleteTheme = checkPermission(
  'delete:/app/live-screen-projection/theme/:id'
)

const pageEnum = {
  list: 'list',
  insert: 'insert',
  view: 'view'
}

export default props => {
  const [currentPage, setCurrentPage] = useState(pageEnum.list)
  const [pageData, setPageData] = useState({})

  function changePageHandler(value, data) {
    setCurrentPage(value)
    data ? setPageData(data) : setPageData({})
  }

  return (
    <div className="single-topic-carousel">
      {currentPage === pageEnum.list ? (
        <ListTopicCarousel
          {...props}
          data={pageData}
          onChangePage={changePageHandler}
        />
      ) : currentPage === pageEnum.insert ? (
        <InsertTopicCarousel
          {...props}
          data={pageData}
          onChangePage={changePageHandler}
        />
      ) : currentPage === pageEnum.view ? (
        <ViewTopicCarousel
          {...props}
          data={pageData}
          onChangePage={changePageHandler}
        />
      ) : null}
    </div>
  )
}

ListTopicCarousel.propTypes = {
  themeList: propTypes.array.isRequired,
  data: propTypes.object,
  onChangePage: propTypes.func.isRequired
}

// 轮播列表
export function ListTopicCarousel(props) {
  let originTableData = props.themeList
  const [tableData, setTableData] = useState(props.themeList)
  const [pagination, setPagination] = useState({
    pageSize: 10,
    current: (props.data && props.data.current) || 1,
    onChange: pageChange,
    total: props.themeList.length
  })
  const [searchValue, setSearchValue] = useState('')
  // 列名
  const columns = [
    {
      title: '',
      width: 80,
      dataIndex: 'rank',
      align: 'center',
      // eslint-disable-next-line react/display-name
      render: (text, record, index) => {
        return (
          <div>
            {(pagination.current - 1) * pagination.pageSize + index + 1}
          </div>
        )
      }
    },
    {
      title: '轮播主题名称',
      dataIndex: 'title',
      width: 600,
      align: 'center'
    },
    {
      title: '轮次',
      dataIndex: 'number',
      align: 'center',
      render: function number(text, record, index){
        return (
          <div>
            {_.get(record, 'contains.length')}
          </div>
        )
      }
    },
    {
      title: '备注',
      dataIndex: 'desc',
      align: 'center'
    },
    {
      title: '操作',
      align: 'center',
      width: 200,
      dataIndex: 'address',
      // eslint-disable-next-line react/display-name
      render: (text, record) => {
        return (
          <div>
            {canViewTheme ? (
              <Tooltip title="查看主题">
                <a
                  className="mg2r"
                  onClick={() => handlerView(record)}
                >
              查看
                </a>
              </Tooltip>
            ) : null}
            {canUpdateTheme ? (
              <Tooltip title="主题编辑">
                <a
                  className="mg2r"
                  onClick={() => handlerEdit(record)}
                >
              编辑
                </a>
              </Tooltip>
            ) : null}
            {canDeleteTheme ? (
              <Tooltip title="删除主题" Tooltip="top">
                <Popconfirm
                  title="确认删除？"
                  onConfirm={() => handleDelete(record)}
                >
                  <a>删除</a>
                </Popconfirm>
              </Tooltip>
            ) : null}
          </div>
        )
      }
    }
  ]

  function handlerView(record) {
    const data = { ...record }
    data.current = pagination.current
    props.onChangePage && props.onChangePage(pageEnum.view, data)
  }

  function handlerEdit(record) {
    props.onChangePage && props.onChangePage(pageEnum.insert, record)
  }

  function handlerAdd() {
    props.onChangePage && props.onChangePage(pageEnum.insert)
  }

  function handleDelete(record) {
    deleteLiveScreenTheme(record.id).then(res => {
      // const idnex = tableData.findIndex(v=>v.id == record.id)
      // tableData.splice(idnex,1)
      // setTableData(tableData)
      // setTimeout(()=>{
      //   console.log(originTableData,tableData,'tbika,')
      // })
      if (tableData.length <= 1) {
        searchData(
          searchValue,
          pagination.current <= 1 ? 1 : pagination.current - 1
        )
      } else {
        searchData(searchValue)
      }
    })
  }

  function pageChange(page) {
    searchData(searchValue, page)
  }

  // 搜索内容
  function searchData(value = '', current = pagination.current) {
    // const data = originTableData.filter(v=>v.title.includes(value))
    getLiveScreenThemeList({
      page: current,
      pageSize: pagination.pageSize,
      search: value
    }).then(res => {
      setPagination({ ...pagination, current, total: res.result.count })
      setTableData(res.result.rows)
      setSearchValue(value)
    })
  }

  useEffect(() => {
    searchData()
  }, [])

  function searchHandler(value) {
    searchData(value, 1)
    // setSearchValue(value)
  }

  return (
    <div className="single-topic-carousel">
      <div
        className="always-display-scrollbar"
        style={{
          overflowY: 'auto',
          height: 'calc(100vh - 93px)'
        }}
      >
        <div className="single-topic-carousel-searchHeader">
          <div className="fix">
            <Search
              placeholder="轮播主题名称"
              onSearch={searchHandler}
              className="fleft"
              style={{ width: 280, height: 34, borderRadius: 10 }}
            />
            {canCreateTheme ? (
              <Button
                onClick={handlerAdd}
                type="primary"
                className="fright"
                style={{ marginRight: 20 }}
              >
                添加新的轮播
              </Button>
            ) : null}
          </div>
        </div>
        <div className="single-topic-carousel-table">
          {
            // <div className="single-topic-carousel-table-header">
            //   <span style={{paddingLeft: 20}}>
            //     <Icon style={{fontSize: 24, verticalAlign: 'middle'}} type="database" theme="filled"/>
            //     <span style={{fontSize: 14, verticalAlign: 'middle'}}>【单主题】轮播列表</span>
            //   </span>
            //   {
            //     canCreateTheme ?
            //       <Button onClick={handlerAdd} type="primary" style={{marginRight: 20}}>添加新的轮播</Button>
            //       : null
            //   }
            // </div>
          }
          <div className="single-topic-carousel-table-content">
            <Table
              pagination={pagination}
              rowKey="id"
              bordered
              columns={columns}
              dataSource={tableData}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// 查看主题
export function ViewTopicCarousel(props) {
  function back() {
    props.onChangePage(pageEnum.list, {
      current: props.data && props.data.current
    })
  }

  useEffect(() => {
    getData()
  }, [props.data])

  const [data, setData] = useState([])
  let [screenControlNum, setScreenControlNum] = useState(4)

  useEffect(() => {
    setScreenControlNum(+(props.screenControlNum))
  }, [props.screenControlNum])

  function getData() {
    selectLiveScreenThemeById(props.data.id).then(async res => {
    })
  }

  let liveScreensMap = {}
  props.screenArr.map(l => {
    liveScreensMap[l.id] = l
  })

  let themeContainListClone = _.get(props.data, 'contains', [])
  if ((_.get(props.data, 'contains[0]').length !== +screenControlNum)) {
    themeContainListClone = themeContainListClone.map(v => {
      if (v.length >= +screenControlNum) {
        return v.slice(0, +screenControlNum)
      }
      const w = String(+screenControlNum - v.length)
      v.push(...new Array(Number(w)).fill(''))
      // v.push(...w.repeat(Number(w)).split('').map(v => ''))
      return v
    })
  }
  
  return (
    <div className="view-topic-carousel">
      <div
        className="always-display-scrollbar"
        style={{
          overflowY: 'auto',
          height: 'calc(100vh - 83px)'
        }}
      >
        <Button type="primary" style={{ margin: 20 }} onClick={back}>
          返回
        </Button>
        {themeContainListClone.map((v, i) => {
          return (
            <div className="view-topic-carousel-warp" key={i}>
              <div className="view-topic-carousel-header">第{i + 1}次轮播</div>
              <div className="view-topic-carousel-content">
                <LiveScreenItems item={v} liveScreensMap={liveScreensMap} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

ViewTopicCarousel.propTypes = {
  data: propTypes.object.isRequired,
  onChangePage: propTypes.func.isRequired
}

const LiveScreenItems = props => {
  return props.item.map((item, idx) => {
    let imgUrl = _.get(props.liveScreensMap, `${item}.cover_image_id`, '')
    return (
      <div
        key={idx}
        style={{ marginRight: 10, marginBottom: 10, minWidth: 175 }}
        className="livescreen-control-top-card-list-box live-screen-items"
      >
        <div className="livescreen-control-top-card-list-title">
          <div className="itblock elli mw-80">
            <TagFilled style={{ color: '#6969D7' }} />
            <span>{idx + 1}号屏</span>
          </div>
        </div>
        <div
          style={{ marginBottom: 10 }}
          className="livescreen-control-top-card-list-content relative hover-display-trigger"
        >
          <Rect aspectRatio={16 / 9} style={{ overflow: 'hidden' }}>
            {!_.isEmpty(imgUrl) ? (
              <UploadedImageViewer
                uploadedImageId={imgUrl}
                className="width-100 center-of-relative"
              />
            ) : null}
          </Rect>
        </div>
      </div>
    )
  })
}

// 大屏轮播
const TopicCarousel = Form.create('topicCarousel')(function(props) {
  function deleteList(ind) {
    props.deleteItem(ind)
  }

  // 改变位置
  function changePosition(type, index) {
    // type 1向上  0 向下
    if (type === 1) {
      [data[index], data[index - 1]] = [data[index - 1], data[index]]
    } else {
      [data[index], data[index + 1]] = [data[index + 1], data[index]]
    }
    props.onChange(data)
  }

  const [data, setData] = useState(props.value)

  useEffect(() => {
    setData(props.value)
  }, [props.value])
  function selectChange(value, ind, idx) {
    data[ind][idx] = value
    props.onChange(data)
  }

  const { getFieldDecorator } = props.form
  return (
    <div className={'topic-carousel'}>
      {data.map((s, ind) => {
        return (
          <div className="mg-auto mg2b" key={ind}>
            <div className="topic-carousel-content">
              <div
                style={{ height: '30px', lineHeight: '30px', paddingLeft: 30 }}
                className="mg1y"
              >
                <span
                  className="font16 fleft"
                  style={{ color: '#606162', fontWeight: 'bold' }}
                >
                  第{ind + 1}次轮播
                </span>
              </div>
              <div style={{ width: '100%' }} className="pd2x pd1y">
                {/*<Form layout="horizontal" onSubmit={submit}*/}
                {/*>*/}
                {s.map((cur, idx) => {
                  return (
                    <Form.Item
                      label={'屏幕' + (idx + 1)}
                      key={`${ind}-${idx}`}
                      hasFeedback
                    >
                      {getFieldDecorator(
                        `topic-carousel-idnex-${ind + 1}-${idx + 1}`,
                        {
                          initialValue: cur
                        }
                      )(
                        <Select
                          getPopupContainer={(triggerNode) => triggerNode.parentNode}
                          onChange={value => selectChange(value, ind, idx)}
                          showSearch
                          getPopupContainer={triggerNode => triggerNode.parentNode}
                          filterOption={(input, option) => {
                            return option.props
                              .children
                              .toLowerCase()
                              .indexOf(input.toLowerCase()) >= 0
                          }}
                        >
                          {props.screenArr.map(k => (
                            <Select.Option key={k.id}>{k.title}</Select.Option>
                          ))}
                        </Select>
                      )}
                    </Form.Item>
                  )
                })}
                {/*</Form>*/}
              </div>
            </div>
            {/*{*/}
            {/*  data && data.length === 1 ?*/}
            {/*    null*/}
            {/*    : <div></div>*/}
            {/*}*/}
            {/*{*/}
            {/*  data && data.length === 99 ?*/}
            {/*    null*/}
            {/*    : <div></div>*/}
            {/*}*/}
            {data && data.length > 1 && data.length < 99 ? (
              <DeleteOutlined
                style={{
                  width: '80px',
                  fontSize: 20,
                  color: '#999',
                  cursor: 'pointer'
                }}
                className="color-main font16 fright"
                onClick={() => {
                  deleteList(ind)
                }}
              />
            ) : null}
          </div>
        )
      })}
      <Button type="primary" onClick={() => props.addData()}>
        新增轮播轮次
      </Button>
    </div>
  )
})

// 新增编辑主题
export const InsertTopicCarousel = Form.create('insert-topic')(function(props) {
  function handleSubmit(e) {
    if (loading) return
    e && e.preventDefault()
    props.form.validateFieldsAndScroll(async (err, values) => {
      if (!err) {
        setLoading(true)
        const data = { ...values }
        let result = null
        if (props.data && props.data.id) {
          data.id = props.data.id
          result = await updateLiveScreenTheme(data)
        } else {
          result = await saveLiveScreenTheme(data)
        }
        setLoading(false)
        if (result) {
          props.onChangePage(pageEnum.list)
          props.getThemeList()
          message.success('操作成功')
        }
      }
    })
  }

  let [loading, setLoading] = useState(false)
  let [screenControlNum, setScreenControlNum] = useState(4)
  const formFields = {
    title: 'title',
    // screenCount: 'screenCount',
    contains: 'contains',
    timer: 'timer',
    desc: 'desc'
  }

  function selectData(id) {
    selectLiveScreenThemeById(id).then(res => {
      let data = {}
      for (let i in formFields) {
        if (i === formFields.timer) continue
        data[i] = res.result[i]
      }
      props.form.setFieldsValue(data)
      setTimeout(() => {
        props.form.setFieldsValue({
          [formFields.timer]: res.result[formFields.timer]
        })
      })
    })
  }

  useEffect(() => {
    if (props.data && props.data.id) {
      selectData(props.data.id)
    }
  }, [])

  useEffect(() => {
    rangeChange(+(props.screenControlNum)) 
    setScreenControlNum(+(props.screenControlNum))
  }, [props.screenControlNum])
  
  function listValidator(rule, value, callback) {
    const { form } = props
    if (!value) {
      return callback('不能为空')
    } else {
      const count = value.reduce((v, cur) => {
        return v + (cur.find(Boolean) ? 1 : 0)
      }, 0)
      if (count === value.length) {
        return callback()
      }
      return callback('每一条轮播最少选择一个屏幕')
    }
  }

  const containList = [1].map(v => new Array(screenControlNum).fill(''))

  function addItem() {
    const values = props.form.getFieldsValue()
    const themeContainListClone = values[formFields.contains]
    themeContainListClone.push(
      new Array(Number(screenControlNum)).fill('')
    )
    props.form.setFieldsValue({ [formFields.contains]: themeContainListClone })
  }

  function deleteItem(ind) {
    const values = props.form.getFieldsValue()
    const themeContainListClone = values[formFields.contains]
    themeContainListClone.splice(ind, 1)
    props.form.setFieldsValue({ [formFields.contains]: themeContainListClone })
  }

  function rangeChange(value) {
    if (value < 1 || value > 10) {
      return message.warning('请输入从1到10之间的数字')
    }
    const values = props.form.getFieldsValue()
    let themeContainListClone = values[formFields.contains]
    themeContainListClone = themeContainListClone.map(v => {
      if (v.length >= value) {
        return v.slice(0, value)
      }
      const w = String(value - v.length)
      v.push(...new Array(Number(w)).fill(''))
      // v.push(...w.repeat(Number(w)).split('').map(v => ''))
      return v
    })
    // setContainList(themeContainListClone)
    props.form.setFieldsValue({ [formFields.contains]: themeContainListClone })
  }

  const values = props.form.getFieldsValue()
  let themeContainListClone = values[formFields.contains]
  if (themeContainListClone && themeContainListClone[0].length !== +screenControlNum) {
    rangeChange(+screenControlNum)
  }

  function clean() {
    props.onChangePage(pageEnum.list)
  }

  const { getFieldDecorator, getFieldValue } = props.form
  return (
    <div className={'insert-topic-carousel'}>
      <div
        className="always-display-scrollbar relative"
        style={{
          overflowY: 'auto',
          height: 'calc(100vh - 93px)'
        }}
      >
        <Button
          className="absolute"
          type="primary"
          style={{ left: '20px', top: '20px' }}
          onClick={clean}
        >
          返回
        </Button>
        <div className="insert-topic-carousel-warp">
          <Form layout="horizontal" onSubmit={handleSubmit}>
            <Form.Item hasFeedback label="主题名称">
              {getFieldDecorator(formFields.title, {
                rules: [
                  {
                    required: true,
                    message: '请输入主题名称'
                  },
                  {
                    required: true,
                    min: 1,
                    max: 30,
                    pattern: /^[\u4e00-\u9fa5_a-zA-Z0-9]+$/ig,
                    message: '请保持在1至30个字符之间,且不能为空格和特殊字符'
                  }
                ]
              })(<Input />)}
            </Form.Item>
            {/*<Form.Item hasFeedback label="轮播屏幕数量（块）">
              {getFieldDecorator('screenCount', {
                initialValue: screenControlNum
              })(
                <InputNumber onChange={rangeChange} disabled min={1} max={10} step={1} />
              )}
              </Form.Item>*/}
            <Form.Item label="将发布的大屏添加到轮播">
              {getFieldDecorator(formFields.contains, {
                initialValue: containList,
                rules: [
                  {
                    required: true,
                    validator: listValidator
                  }
                ]
              })(
                <TopicCarousel
                  addData={addItem}
                  screenArr={props.screenArr}
                  deleteItem={deleteItem}
                />
              )}
            </Form.Item>
            {getFieldValue(formFields.contains).length > 1 ? (
              <Form.Item hasFeedback label="设置轮播时间（秒）">
                {getFieldDecorator(formFields.timer, {
                  rules: [
                    {
                      required: true,
                      message: '请输入时间'
                    },
                    {
                      validator: (rule, value, callback) => {
                        if (value % 10 !== 0) {
                          callback('请输入10秒的倍数')
                        }
                        callback()
                      }
                    }
                  ]
                })(<InputNumber min={1} step={10} placeholder="请输入10秒的倍数"/>)}
              </Form.Item>
            ) : null}
            <Form.Item hasFeedback label="备注">
              {getFieldDecorator(formFields.desc, {
                rules: [
                  {
                    required: false,
                    max: 500,
                    message: '请保持在500个字符以内'
                  }
                ]
              })(<Input.TextArea resize="none" rows={4} />)}
            </Form.Item>
            <Form.Item
              className="fright"
              style={{ width: '100%', textAlign: 'right' }}
            >
              <Button
                htmlType="submit"
                loading={loading}
                type="primary"
                style={{ marginRight: 10 }}
              >
                保存
              </Button>
              <Button onClick={clean}>取消</Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  )
})
