import React from 'react'
import PropTypes from 'prop-types'
import { DownOutlined, MinusCircleOutlined } from '@ant-design/icons'
import { Button, Dropdown, Menu, InputNumber, Card, Select, Input, Row, Col } from 'antd'
import _ from 'lodash'

const CONFINBTNTITLE = '增加配置'
const cellColor = '#ececec'
const redDotColor = '#DC143C'
const redDotSize = '17px'
const redDotTop = '4px'

const TRIM = 'trim'
const REPLACE = 'replace'
const NUMBERFILTER = 'number_filter'
const STRINGFILTER = 'string_filter'
const SENSITIVEINFO = 'sensitive_info'
const DATEFORMAT = 'date_format'
const JOINCOLUMN = 'join_column'
const SPLITCOLUMN = 'split_column'
const JSONRESOLVE = 'json_resolve'

const NAMED = {
  trim: '去空格过滤器',
  replace: '替换过滤器',
  number_filter: '数字过滤器',
  string_filter: '字符串过滤器',
  sensitive_info: '敏感信息过滤器',
  date_format: '日期过滤器',
  join_column: '字段合并过滤器',
  split_column: '字段分割过滤器',
  json_resolve: 'json打平过滤器'
}
export default class Extractor extends React.Component {
  static propTypes = {
    changeState: PropTypes.func,
    list: PropTypes.array,
    taskMap: PropTypes.object
  };

  setParentConverters(list) {
    let { taskMap } = this.props
    if (_.isEmpty(taskMap)) {
      taskMap = {
        cleaner: {}
      }
    }
    this.props.changeState({
      taskMap: {
        ...taskMap,
        cleaner: {
          ...taskMap.cleaner,
          converterList: list
        }
      }
    })
  }

  componentDidUpdate(prevProps) {
    if (!_.isEqual(prevProps.list, this.props.list)) {
      console.log(this.props.list, 'handleMenuClick====', prevProps.list)
    }
  }

  menu = () => {
    return (
      <Menu onClick={(e) => this.handleMenuClick(e)}>
        <Menu.Item key={TRIM}> {NAMED[TRIM]} </Menu.Item>
        <Menu.Item key={REPLACE}>{NAMED[REPLACE]}</Menu.Item>
        <Menu.Item key={NUMBERFILTER}>{NAMED[NUMBERFILTER]}</Menu.Item>
        <Menu.Item key={STRINGFILTER}>{NAMED[STRINGFILTER]}</Menu.Item>
        <Menu.Item key={SENSITIVEINFO}>{NAMED[SENSITIVEINFO]}</Menu.Item>
        <Menu.Item key={DATEFORMAT}>{NAMED[DATEFORMAT]}</Menu.Item>
        <Menu.Item key={JOINCOLUMN}>{NAMED[JOINCOLUMN]}</Menu.Item>
        <Menu.Item key={SPLITCOLUMN}>{NAMED[SPLITCOLUMN]}</Menu.Item>
        <Menu.Item key={JSONRESOLVE}>{NAMED[JSONRESOLVE]}</Menu.Item>
      </Menu>
    )
  };

  handleMenuClick = (e) => {
    let { list: values } = this.props
    let list = _.clone(values)
    let item
    switch (e.key) {
      case TRIM:
        item = {
          type: TRIM,
          configs: []
        }

        break
      case REPLACE:
        item = {
          type: REPLACE,
          configs: [
            {
              name: '',
              pattern: '',
              target: '',
              onlyFirst: 'false'
            }
          ]
        }
        break
      case NUMBERFILTER:
        item = {
          type: NUMBERFILTER,
          configs: [
            {
              name: '',
              minValue: 0,
              maxValue: 0,
              isExclude: 'false'
            }
          ]
        }
        break
      case STRINGFILTER:
        item = {
          type: STRINGFILTER,
          configs: [
            {
              name: '',
              regex: '',
              isExclude: 'false'
            }
          ]
        }
        break
      case SENSITIVEINFO:
        item = {
          type: SENSITIVEINFO,
          configs: [
            {
              name: '',
              startIndex: 0,
              endIndex: 0,
              replacer: '*'
            }
          ]
        }
        break
      case DATEFORMAT:
        item = {
          type: DATEFORMAT,
          configs: [
            {
              name: '',
              inputFormat: 'yyyy-MM-dd HH:mm:ss',
              outputFormat: 'timestamp',
              timezone: 'UTC'
            }
          ]
        }
        break
      case JOINCOLUMN:
        item = {
          type: JOINCOLUMN,
          configs: [
            {
              isNumber: 'false',
              newColumnName: '',
              expression: '',
              reserveOldColumn: 'false'
            }
          ]
        }
        break
      case JSONRESOLVE:
        item = {
          type: JSONRESOLVE,
          configs: [
            {
              name: '',
              separator: '',
              newColumnNames: '',
              reserveOldColumn: 'false'
            }
          ]
        }
        break
      case SPLITCOLUMN:
        item = {
          type: SPLITCOLUMN,
          configs: [
            {
              name: '',
              separator: '',
              newColumnNames: '',
              reserveOldColumn: 'false'
            }
          ]
        }
        break
      default:
    }
    list.push(item)
    this.setParentConverters(list)
  };

  addConfigurationItem = (index) => {
    const { list } = this.props
    let currentList = _.clone(list)
    let item = currentList[index]
    switch (item.type) {
      case REPLACE:
        item.configs.push({
          name: '',
          pattern: '',
          target: '',
          onlyFirst: 'false'
        })
        break
      case NUMBERFILTER:
        item.configs.push({
          name: '',
          minValue: 0,
          maxValue: 0,
          isExclude: 'false'
        })
        break
      case STRINGFILTER:
        item.configs.push({
          name: '',
          regex: '',
          isExclude: 'false'
        })
        break
      case SENSITIVEINFO:
        item.configs.push({
          name: '',
          startIndex: 0,
          endIndex: 0,
          replacer: '*'
        })
        break
      case DATEFORMAT:
        item.configs.push({
          name: '',
          inputFormat: 'yyyy-MM-dd HH:mm:ss',
          outputFormat: 'timestamp',
          timezone: 'default'
        })
        break
      case JSONRESOLVE:
        item.configs.push({
          name: '',
          keyJoiner: '_',
          reserveOldColumn: 'false'
        })
        break
      case JOINCOLUMN:
        item.configs.push({
          isNumber: 'false',
          newColumnName: '',
          expression: '',
          reserveOldColumn: 'false'
        })
        break
      case SPLITCOLUMN:
        item.configs.push({
          isNumber: 'false',
          newColumnName: '',
          expression: '',
          reserveOldColumn: 'false'
        })
        break
      default:
        break
    }
    currentList[index] = item
    this.setParentConverters(currentList)
  };

  selectExtractor = (index) => {
    let item = this.props.list[index]
    switch (item.type) {
      case TRIM:
        return this.trimExtractor(item, index)
      case REPLACE:
        return this.replaceExtractor(item, index)
      case NUMBERFILTER:
        return this.numberFilterExtractor(item, index)
      case STRINGFILTER:
        return this.stringFilterExtractor(item, index)
      case SENSITIVEINFO:
        return this.sensitiveInfoExtractor(item, index)
      case DATEFORMAT:
        return this.dateFormatExtractor(item, index)
      case JSONRESOLVE:
        return this.jsonResolveExtractor(item, index)
      case JOINCOLUMN:
        return this.joinColumnExtractor(item, index)
      case SPLITCOLUMN:
        return this.splitColumnExtractor(item, index)
    }
  };

  jsonResolveExtractor = (item, index) => {
    const { configs: itemList } = item
    return (
      <div>
        <div>
          <Button
            type="primary"
            onClick={() => this.addConfigurationItem(index)}
          >
            {CONFINBTNTITLE}
          </Button>
        </div>
        <div>
          {itemList.map((p, i) => {
            return (
              <Card
                className="mg2t"
                style={{ width: '100%', background: cellColor }}
              >
                <div>
                  <div
                    style={{
                      color: redDotColor,
                      marginTop: redDotTop,
                      fontSize: redDotSize
                    }}
                    className=" iblock"
                  >
                    *
                  </div>
                  字段名:
                  <Input
                    className="mg2l mg3r width160"
                    value={p.name}
                    style={{ width: '50%' }}
                    placeholder="请输入字段"
                    onChange={(v) =>
                      this.handleChange(v.target.value, index, i, 'name')
                    }
                  />
                  键的连接符:
                  <Input
                    className="mg2l mg3r"
                    value={p.keyJoiner}
                    style={{ width: '100px' }}
                    placeholder={'请输入连接符'}
                    onChange={(v) =>
                      this.handleChange(v.target.value, index, i, 'keyJoiner')
                    }
                  />
                  是否保留原有字段:
                  <Select
                    className="mg2l mg3r"
                    value={p.reserveOldColumn === 'false' ? 'no' : 'yes'}
                    onChange={(v) =>
                      this.handleChange(v, index, i, 'reserveOldColumn')
                    }
                  >
                    <Option value="true">yes</Option>
                    <Option value="false">no</Option>
                  </Select>
                  <MinusCircleOutlined
                    title="移除这个配置"
                    className="color-grey font16 pointer line-height32 hover-color-red mg3l fright"
                    onClick={() => this.deleteConfigurationItem(index, i)} />
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  joinColumnExtractor = (item, index) => {
    const { configs: itemList } = item
    return (
      <div>
        <div>
          <Button
            type="primary"
            onClick={() => this.addConfigurationItem(index)}
          >
            {CONFINBTNTITLE}
          </Button>
        </div>
        <div>
          {itemList.map((p, i) => {
            return (
              <Card
                className="mg2t"
                style={{ width: '100%', background: cellColor }}
              >
                <div>
                  <div
                    style={{
                      color: redDotColor,
                      marginTop: redDotTop,
                      fontSize: redDotSize
                    }}
                    className=" iblock"
                  >
                    *
                  </div>
                  合并字段表达式:
                  <Input
                    className="mg1l "
                    style={{ width: '75%' }}
                    value={p.expression}
                    placeholder={'请输入表达式'}
                    onChange={(v) =>
                      this.handleChange(v.target.value, index, i, 'expression')
                    }
                  />
                  <MinusCircleOutlined
                    title="移除这个配置"
                    className="color-grey font16 pointer line-height32 hover-color-red mg3l fright"
                    onClick={() => this.deleteConfigurationItem(index, i)} />
                </div>

                <div className="mg2t">
                  <div
                    style={{
                      color: redDotColor,
                      marginTop: redDotTop,
                      fontSize: redDotSize
                    }}
                    className=" iblock"
                  >
                    *
                  </div>
                  新字段名:
                  <Input
                    className="mg2l mg3r"
                    style={{ width: '120px' }}
                    value={p.newColumnName}
                    placeholder={'请输入新字段名'}
                    onChange={(v) =>
                      this.handleChange(
                        v.target.value,
                        index,
                        i,
                        'newColumnName'
                      )
                    }
                  />
                  是否数值类型:
                  <Select
                    className="mg2l mg3r"
                    value={p.isNumber === 'false' ? 'no' : 'yes'}
                    onChange={(v) => this.handleChange(v, index, i, 'isNumber')}
                  >
                    <Option value="true">yes</Option>
                    <Option value="false">no</Option>
                  </Select>
                  是否保留原有字段:
                  <Select
                    className="mg2l mg3r"
                    value={p.reserveOldColumn === 'false' ? 'no' : 'yes'}
                    onChange={(v) =>
                      this.handleChange(v, index, i, 'reserveOldColumn')
                    }
                  >
                    <Option value="true">yes</Option>
                    <Option value="false">no</Option>
                  </Select>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  splitColumnExtractor = (item, index) => {
    const { configs: itemList } = item
    return (
      <div>
        <div>
          <Button
            type="primary"
            onClick={() => this.addConfigurationItem(index)}
          >
            {CONFINBTNTITLE}
          </Button>
        </div>
        <div>
          {itemList.map((p, i) => {
            return (
              <Card
                className="mg2t"
                style={{ width: '100%', background: cellColor }}
              >
                <div>
                  <div
                    style={{
                      color: redDotColor,
                      marginTop: redDotTop,
                      fontSize: redDotSize
                    }}
                    className=" iblock"
                  >
                    *
                  </div>
                  分割后字段名:
                  <Input
                    className="mg1l "
                    style={{ width: '75%' }}
                    value={p.newColumnNames}
                    placeholder={'分割后的字段名，通过英文逗号分隔'}
                    onChange={(v) =>
                      this.handleChange(
                        v.target.value,
                        index,
                        i,
                        'newColumnNames'
                      )
                    }
                  />
                  <MinusCircleOutlined
                    title="移除这个配置"
                    className="color-grey font16 pointer line-height32 hover-color-red mg3l fright"
                    onClick={() => this.deleteConfigurationItem(index, i)} />
                </div>

                <div className="mg2t">
                  <div
                    style={{
                      color: redDotColor,
                      marginTop: redDotTop,
                      fontSize: redDotSize
                    }}
                    className=" iblock"
                  >
                    *
                  </div>
                  字段名:
                  <Input
                    className="mg2l mg3r width160"
                    style={{ width: '120px' }}
                    value={p.name}
                    placeholder={'请输入需要分割的字段名'}
                    onChange={(v) =>
                      this.handleChange(v.target.value, index, i, 'name')
                    }
                  />
                  <div
                    style={{
                      color: redDotColor,
                      marginTop: redDotTop,
                      fontSize: redDotSize
                    }}
                    className=" iblock"
                  >
                    *
                  </div>
                  字段的分割符:
                  <Input
                    className="mg2l mg3r "
                    style={{ width: '100px' }}
                    value={p.separator}
                    placeholder={'字段的分割符'}
                    onChange={(v) =>
                      this.handleChange(v.target.value, index, i, 'separator')
                    }
                  />
                  是否保留原有字段:
                  <Select
                    className="mg2l mg3r"
                    value={p.reserveOldColumn === 'false' ? 'no' : 'yes'}
                    onChange={(v) =>
                      this.handleChange(v, index, i, 'reserveOldColumn')
                    }
                  >
                    <Option value="true">yes</Option>
                    <Option value="false">no</Option>
                  </Select>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  deleteConfigurationItem = (index, cellIndex) => {
    let { list } = this.props
    list = _.cloneDeep(list)
    let item = _.get(list, index, {})
    _.set(
      list,
      `${index}.configs`,
      item.configs.filter((p, i) => i !== cellIndex)
    )
    this.setParentConverters(list)
  };

  deleteExtractor = (index) => {
    let { list } = this.props
    list = list.filter((p, i) => i !== index)
    this.setParentConverters(list)
  };

  dateFormatExtractor = (item, index) => {
    const { configs: itemList } = item
    return (
      <div>
        <div>
          <Button
            type="primary"
            onClick={() => this.addConfigurationItem(index)}
          >
            {CONFINBTNTITLE}
          </Button>
        </div>
        <div>
          {itemList.map((p, i) => {
            return (
              <Card
                className="mg2t"
                style={{ width: '100%', background: cellColor }}
              >
                <div>
                  <Row>
                    <Col span={7}>
                      <div
                        style={{
                          color: redDotColor,
                          marginTop: redDotTop,
                          fontSize: redDotSize
                        }}
                        className=" width40 alignright iblock"
                      >
                        *
                      </div>
                      <div className=" iblock">字段名:</div>

                      <Input
                        className="mg1l mg2r width120"
                        value={p.name}
                        placeholder={'请输入字段名'}
                        onChange={(v) =>
                          this.handleChange(v.target.value, index, i, 'name')
                        }
                      />
                    </Col>
                    <Col span={15}>
                      <div className="width80 alignright iblock elli">
                        输入日期格式:
                      </div>
                      <div
                        className="iblock"
                        style={{ width: 'calc( 100% - 80px)' }}
                      >
                        <Input
                          className="mg1l mg2r width-100"
                          value={p.inputFormat}
                          placeholder={'请输入日期格式'}
                          onChange={(v) =>
                            this.handleChange(
                              v.target.value,
                              index,
                              i,
                              'inputFormat'
                            )
                          }
                        />
                      </div>
                    </Col>
                    <Col span={2}>
                      <MinusCircleOutlined
                        title="移除这个配置"
                        className="color-grey font16 pointer line-height32 hover-color-red mg3l fright"
                        onClick={() => this.deleteConfigurationItem(index, i)} />
                    </Col>
                  </Row>
                </div>

                <div className="mg2t">
                  <Row>
                    <Col span={7}>
                      <div className="width80 alignright iblock">时区:</div>
                      <Input
                        className="mg1l mg2r width120"
                        value={p.timezone}
                        placeholder={'请输入时区'}
                        onChange={(v) =>
                          this.handleChange(
                            v.target.value,
                            index,
                            i,
                            'timezone'
                          )
                        }
                      />
                    </Col>
                    <Col span={15}>
                      <div className="width80 alignright iblock elli">
                        输出日期格式:
                      </div>
                      <div
                        className="iblock"
                        style={{ width: 'calc( 100% - 80px)' }}
                      >
                        <Input
                          value={p.outputFormat}
                          className="mg1l mg2r width-100"
                          placeholder={'请输入日期格式'}
                          onChange={(v) =>
                            this.handleChange(
                              v.target.value,
                              index,
                              i,
                              'outputFormat'
                            )
                          }
                        />
                      </div>
                    </Col>
                    <Col span={2} />
                  </Row>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    )
  };

  numberFilterExtractor = (item, index) => {
    const { configs: itemList } = item
    return (
      <div>
        <div>
          <Button
            type="primary"
            onClick={() => this.addConfigurationItem(index)}
          >
            {CONFINBTNTITLE}
          </Button>
        </div>
        <div>
          {itemList.map((p, i) => {
            return (
              <Card
                className="mg2t"
                style={{ width: '100%', background: cellColor }}
              >
                <div>
                  <div
                    style={{
                      color: redDotColor,
                      marginTop: redDotTop,
                      fontSize: redDotSize
                    }}
                    className="iblock"
                  >
                    *
                  </div>
                  字段名:
                  <Input
                    className="mg2l mg3r width120"
                    value={p.name}
                    placeholder={'请输入字段名'}
                    onChange={(v) =>
                      this.handleChange(v.target.value, index, i, 'name')
                    }
                  />
                  <div
                    style={{
                      color: redDotColor,
                      marginTop: redDotTop,
                      fontSize: redDotSize
                    }}
                    className="iblock"
                  >
                    *
                  </div>
                  最小值:
                  <InputNumber
                    className="mg2l mg3r"
                    value={p.minValue}
                    onChange={(v) => this.handleChange(v, index, i, 'minValue')}
                  />
                  <div
                    style={{
                      color: redDotColor,
                      marginTop: redDotTop,
                      fontSize: redDotSize
                    }}
                    className="iblock"
                  >
                    *
                  </div>
                  最大值:
                  <InputNumber
                    className="mg2l mg3r"
                    value={p.maxValue}
                    onChange={(v) => this.handleChange(v, index, i, 'maxValue')}
                  />
                  是否保留值:
                  <Select
                    className="mg2l mg1r"
                    value={p.isExclude === 'false' ? 'no' : 'yes'}
                    onChange={this.handleChange}
                  >
                    <Option value="true">yes</Option>
                    <Option value="false">no</Option>
                  </Select>
                  <MinusCircleOutlined
                    title="移除这个配置"
                    className="color-grey font16 pointer line-height32 hover-color-red mg3l fright"
                    onClick={() => this.deleteConfigurationItem(index, i)} />
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  stringFilterExtractor = (item, index) => {
    const { configs: itemList } = item
    return (
      <div>
        <div>
          <Button
            type="primary"
            onClick={() => this.addConfigurationItem(index)}
          >
            {CONFINBTNTITLE}
          </Button>
        </div>
        <div>
          {itemList.map((p, i) => {
            return (
              <Card
                className="mg2t"
                style={{ width: '100%', background: cellColor }}
              >
                <div>
                  <div
                    style={{
                      color: redDotColor,
                      marginTop: redDotTop,
                      fontSize: redDotSize
                    }}
                    className="iblock"
                  >
                    *
                  </div>
                  字段名:
                  <Input
                    value={p.name}
                    className="mg1l mg2r width120"
                    placeholder={'请输入字段名'}
                    onChange={(v) =>
                      this.handleChange(v.target.value, index, i, 'name')
                    }
                  />
                  是否保留值:
                  <Select
                    className="mg1l mg2r"
                    value={p.isExclude === 'false' ? 'no' : 'yes'}
                    onChange={(v) => this.handleChange(v, index, i, 'minValue')}
                  >
                    <Option value="true">yes</Option>
                    <Option value="false">no</Option>
                  </Select>
                  <div
                    style={{
                      color: redDotColor,
                      marginTop: redDotTop,
                      fontSize: redDotSize
                    }}
                    className="iblock"
                  >
                    *
                  </div>
                  正则表达式:
                  <Input
                    value={p.regex}
                    className="mg1l"
                    style={{ width: '320px' }}
                    placeholder={'请输入正则表达式'}
                    onChange={(v) =>
                      this.handleChange(v.target.value, index, i, 'regex')
                    }
                  />
                  <MinusCircleOutlined
                    title="移除这个配置"
                    className="color-grey font16 pointer line-height32 hover-color-red mg3l fright"
                    onClick={() => this.deleteConfigurationItem(index, i)} />
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    )
  };

  sensitiveInfoExtractor = (item, index) => {
    const { configs: itemList } = item
    return (
      <div>
        <div>
          <Button
            type="primary"
            onClick={() => this.addConfigurationItem(index)}
          >
            {CONFINBTNTITLE}
          </Button>
        </div>
        <div>
          {itemList.map((p, i) => {
            return (
              <Card
                className="mg2t"
                style={{ width: '100%', background: cellColor }}
              >
                <div>
                  <div
                    style={{
                      color: redDotColor,
                      marginTop: redDotTop,
                      fontSize: redDotSize
                    }}
                    className="iblock"
                  >
                    *
                  </div>
                  字段名:
                  <Input
                    className="mg2l mg2r width120"
                    value={p.name}
                    placeholder={'请输入字段名'}
                    onChange={(v) =>
                      this.handleChange(v.target.value, index, i, 'name')
                    }
                  />
                  替换起始位置:
                  <InputNumber
                    className="mg2l mg2r"
                    value={p.startIndex}
                    onChange={(v) =>
                      this.handleChange(v, index, i, 'startIndex')
                    }
                  />
                  替换最终位置:
                  <InputNumber
                    className="mg2l mg2r"
                    value={p.endIndex}
                    onChange={(v) => this.handleChange(v, index, i, 'endIndex')}
                  />
                  替换符:
                  <Input
                    className="mg2l"
                    value={p.replacer}
                    style={{ width: '50px' }}
                    placeholder={'换行符'}
                    onChange={(v) =>
                      this.handleChange(v.target.value, index, i, 'replacer')
                    }
                  />
                  <MinusCircleOutlined
                    title="移除这个配置"
                    className="color-grey font16 pointer line-height32 hover-color-red mg3l fright"
                    onClick={() => this.deleteConfigurationItem(index, i)} />
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    )
  }

  replaceExtractor = (item, index) => {
    const { configs: itemList } = item
    return (
      <div>
        <div>
          <Button
            type="primary"
            onClick={() => this.addConfigurationItem(index)}
          >
            {CONFINBTNTITLE}
          </Button>
        </div>
        <div>
          {itemList.map((p, i) => {
            return (
              <Card
                className="mg2t"
                style={{ width: '100%', background: cellColor }}
              >
                <div>
                  <Row>
                    <Col span={6}>
                      <div
                        className="width80 alignright"
                        style={{
                          color: redDotColor,
                          marginTop: redDotTop,
                          fontSize: redDotSize
                        }}
                        className="iblock"
                      >
                        *
                      </div>
                      <div className="iblock">字段名:</div>

                      <Input
                        className="mg2l"
                        value={p.name}
                        style={{ width: '50%' }}
                        placeholder="请输入字段"
                        onChange={(v) =>
                          this.handleChange(v.target.value, index, i, 'name')
                        }
                      />
                    </Col>
                    <Col span={17}>
                      <div
                        className="width80 alignright "
                        style={{
                          color: redDotColor,
                          marginTop: redDotTop,
                          fontSize: redDotSize
                        }}
                        className="iblock"
                      >
                        *
                      </div>
                      <div className="iblock elli">正则表达式:</div>
                      <div
                        className="iblock"
                        style={{ width: 'calc( 100% - 80px)' }}
                      >
                        <Input
                          value={p.pattern}
                          className="mg1l mg2r width-100"
                          placeholder={'请输入正则表达式'}
                          onChange={(v) =>
                            this.handleChange(
                              v.target.value,
                              index,
                              i,
                              'pattern'
                            )
                          }
                        />
                      </div>
                    </Col>

                    <Col span={1}>
                      <MinusCircleOutlined
                        title="移除这个配置"
                        className="color-grey font16 pointer line-height32 hover-color-red mg3l fright"
                        onClick={() => this.deleteConfigurationItem(index, i)} />
                    </Col>
                  </Row>
                </div>

                <div className="mg2t">
                  <Row>
                    <Col span={6}>
                      <div className="width55 alignright iblock">首次替换:</div>
                      <Select
                        className=" mg1r width120"
                        value={p.onlyFirst === 'false' ? 'no' : 'yes'}
                        onChange={this.handleChange}
                      >
                        <Option value="true">yes</Option>
                        <Option value="false">no</Option>
                      </Select>
                    </Col>
                    <Col span={17}>
                      <div
                        className="width80 alignright"
                        style={{
                          color: redDotColor,
                          marginTop: redDotTop,
                          fontSize: redDotSize
                        }}
                        className="iblock"
                      >
                        *
                      </div>
                      <div className="iblock elli">目标字符串:</div>
                      <div
                        className="iblock"
                        style={{ width: 'calc( 100% - 80px)' }}
                      >
                        <Input
                          value={p.target}
                          className="mg1l mg2r width-100"
                          placeholder={'请输入目标字符串'}
                          onChange={(v) =>
                            this.handleChange(
                              v.target.value,
                              index,
                              i,
                              'target'
                            )
                          }
                        />
                      </div>
                    </Col>
                    <Col span={1} />
                  </Row>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    )
  };

  trimExtractor = (item, index) => {
    return (
      <div>
        <div
          style={{
            color: redDotColor,
            marginTop: redDotTop,
            fontSize: redDotSize
          }}
          className="mg1r iblock"
        >
          *
        </div>
        选择字段
        <Input
          className="mg2l"
          value={item.configs}
          style={{ width: '90%' }}
          placeholder="请输入过滤字段，以英文逗号隔开"
          onChange={(v) =>
            this.handleChange(v.target.value, index, -1, 'configs')
          }
        />
      </div>
    )
  };

  handleChange = (value, i, x, p) => {
    let { list } = this.props
    list = _.cloneDeep(list)
    if (x !== -1) {
      _.set(list, `${i}.configs.${x}.${p}`, value)
    } else {
      _.set(list, `${i}.configs`, value)
    }
    this.setParentConverters(list)
  };

  render() {
    return (
      <div>
        {this.getFields()}
        <Dropdown overlay={this.menu()} className="mg2t">
          <Button style={{ marginLeft: 8 }}>
            增加过滤器 <DownOutlined />
          </Button>
        </Dropdown>
      </div>
    )
  }

  getFields() {
    const { list } = this.props
    const children = []
    for (let i = 0; i < list.length; i++) {
      let item = list[i]
      children.push(
        <Card
          className="mg2t"
          title={NAMED[item.type]}
          extra={
            <Button type="primary" onClick={() => this.deleteExtractor(i)}>
              删除
            </Button>
          }
          style={{ width: '95%' }}
        >
          {this.selectExtractor(i)}
        </Card>
      )
    }
    return children
  }
}
