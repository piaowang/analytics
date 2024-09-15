import React from 'react'
import PropTypes from 'prop-types'
import { MinusCircleOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Input, Button, Popconfirm } from 'antd';
import _ from 'lodash'
import Ot from './object-tool'

@Form.create()
class TypeConfig extends React.Component {

  static defaultProps = {
    base: [],
    advance: [],
    def: {},
    onMount: _.noop
  }

  static propTypes = {
    base: PropTypes.array,
    advance: PropTypes.array,
    def: PropTypes.object,
    onMount: PropTypes.func
  }

  constructor (props, context) {
    super(props, context)
    const { def, base, advance } = props

    this.state = {
      visibleAdvance: false,
      base: _.cloneDeep(base),
      advance: _.cloneDeep(advance),
      ot: new Ot(_.cloneDeep(def)),
      custom: [],
      mark: '__@__@'
    }
  }

  componentDidMount () {
    this.props.onMount(this)
  }

  componentWillReceiveProps (nextProps) {
    const { def, base, advance } = nextProps
    this.setState({
      base: _.cloneDeep(base),
      advance: _.cloneDeep(advance),
      ot: new Ot(_.cloneDeep(def)),
      custom: []
    })
  }

  getCustomMark (mark) {
    return `${this.state.mark}__${mark}`
  }

  isCustomKey (key) {
    return key ? key.indexOf(this.state.mark) === 0 : true
  }

  addCustom () {
    const { custom } = this.state
    this.setState({ custom: custom.concat(this.getCustomMark(custom.length)) })
  }

  delCustom (index) {
    const mark = this.getCustomMark(index)
    this.setState({ custom: this.state.custom.filter(m => m !== mark) })
  }

  async getConf () {
    return new Promise((resolve, reject) => {
      this.props.form.validateFieldsAndScroll((err, values) => {
        if (err) return reject(err)

        const { ot, base, advance } = this.state
        const keys = Object.keys(values)
        const custom = []
        const conf = []
        const list = base.concat(advance)

        keys.forEach(k => (this.isCustomKey(k) ? custom : conf).push(k))

        conf.forEach(key => {
          const t = list.find(f => f.key === key)

          if (!t.children) {
            ot.set(t.path, t.set(t, list, values[key], ot))
          } else {
            const value = values[key]
            t.children.forEach(r => {
              // record, base, value, ot
              ot.set(
                Ot.createPath([t.path, r.path]),
                r.set(r, list, value[r.path], ot)
              )
            })
          }
        })

        custom.forEach(key => {
          const v = values[key]
          const arr = v.split('=')
          const path = arr[0].split('.')
          let val = arr[1]
          try {
            val = JSON.parse(val)
          } catch (e) {
            val = val.toString()
          }
          ot.set(path, val)
        })

        resolve(ot.valueOf())
      })
    })
  }

  render () {
    const { base, advance, visibleAdvance, custom } = this.state
    const { form: { getFieldDecorator } } = this.props

    const formItemLayout = {
      labelCol: {span: 5},
      wrapperCol: {span: 19}
    }

    const generate = list => {
      return list.filter(r => r.visible).map((r, i) => {
        if (r.children) {
          return (
            <Form.Item {...formItemLayout} label={r.label} key={i}>
              {r.children.map((v, j) => {
                return (
                  <div key={j}>
                    <Form.Item {...formItemLayout} label={v.label} key={j}>
                      {v.element(v, r, this.props, this.state)}
                    </Form.Item>
                  </div>
                )
              })}
            </Form.Item>
          )
        }
        const children = r.element(r, void 0, this.props, this.state)
        return (
          <Form.Item {...formItemLayout} label={r.label} key={i}>
            {children}
          </Form.Item>
        )
      })
    }

    return (
      <div>
        <Form>
          {generate(base)}
          { advance.length > 0
            ? (
              <div className="pd2l">
                <Button
                  size="small"
                  onClick={() => this.setState({
                    visibleAdvance: !this.state.visibleAdvance
                  })}
                >
                  <span>{visibleAdvance ? '隐藏' : '显示'}高级设置</span>
                </Button>
              </div>
            )
            : null
          }
          {(visibleAdvance && advance.length > 0)
            ? (
              <div className="pd2t">
                {generate(advance)}
              </div>
            )
            : null
          }
        </Form>
        {/*<div className="pd2l pd2t pd2b">*/}
        {/*<Button*/}
        {/*size="small"*/}
        {/*type="primary"*/}
        {/*icon="plus-circle-o"*/}
        {/*onClick={() => this.addCustom()}*/}
        {/*>*/}
        {/*添加自定义参数*/}
        {/*</Button>*/}
        {/*</div>*/}
        <Form>
          {custom.map((key, i) => (
            <Form.Item
              {...formItemLayout}
              label={`自定义项目-${i}`}
              key={key}
            >
              <Popconfirm
                placement="right"
                title={'格式：a.b.c=d或a.b.c={"a":1,"b":2}'}
              >
                {
                  getFieldDecorator(
                    key,
                    {
                      rules: [
                        { required: true, message: '请输入内容' },
                        { pattern: /^(?:\w+(?:\.\w+)*?)+=.+$/, message: '格式不正确' }
                      ]
                    }
                  )(<Input />)
                }
              </Popconfirm>
              <span className="pd2l">
                <MinusCircleOutlined onClick={() => this.delCustom(i)} />
              </span>
            </Form.Item>
          ))}
        </Form>
      </div>
    );
  }
}

export { TypeConfig }
