import React from 'react'
import { CloseCircleOutlined } from '@ant-design/icons'
import { Button, Modal, Carousel, Popconfirm, Steps, Row, Col } from 'antd'
import classNames from 'classnames'
import Rect from '../Common/react-rectangle'
import guideIcon1 from '../../images/loss-predict-guide-1.svg'
import guideIcon2 from '../../images/loss-predict-guide-2.svg'
import guideIcon3 from '../../images/loss-predict-guide-3.svg'
import { Anchor } from '../Common/anchor-custom'

const Step = Steps.Step

function ImgInLink({ src, ...rest }) {
  return (
    <Anchor href={src} target='_blank'>
      <img src={src} {...rest} />
    </Anchor>
  )
}

class LossGuideModal extends React.Component {
  state = {
    currentSlide: 0
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.visible !== nextProps.visible && nextProps.visible === false) {
      setTimeout(() => {
        this.setState({
          currentSlide: 0
        })
        this.goToSlide(0)
      }, 500)
    }
  }

  goToSlide = index => {
    if (index < 0 || index > 4) return
    this.refs.slider.refs.slick.slickGoTo(index)
  }

  onSlideChanged = current => {
    this.setState({
      currentSlide: current
    })
  }

  onClickNextButton = () => {
    const { currentSlide } = this.state
    if (currentSlide === 4) {
      this.props.onCancel && this.props.onCancel()
    } else {
      this.goToSlide(currentSlide + 1)
    }
  }

  render() {
    const { currentSlide } = this.state
    let guideIconStyle = { height: 137, width: 137 }
    return (
      <Modal
        title={
          <div>
            流失预测操作指引
            <button aria-label='Close' className='ant-modal-close'>
              <Popconfirm title='是否退出流失操作指引？' onConfirm={() => this.props.onCancel && this.props.onCancel()}>
                <span className='pd1l pointer font22'>
                  <CloseCircleOutlined />
                </span>
              </Popconfirm>
            </button>
          </div>
        }
        className='width-80 loss-predict-guide-modal'
        footer={false}
        maskClosable={false}
        closable={false}
        {...this.props}
      >
        {0 < currentSlide ? (
          <section className='absolute width-100 aligncenter pd2 mg3t'>
            <Steps className='iblock width-60 mg3t alignleft' current={currentSlide - 1}>
              <Step title='导入数据' />
              <Step title='生成模型' />
              <Step title='加入预测' />
              <Step title='得出结果' />
            </Steps>
          </section>
        ) : null}

        <Carousel ref='slider' initialSlide={currentSlide} afterChange={this.onSlideChanged} dots={false}>
          <div>
            <div className='height80 relative'>
              <div className='center-of-relative'>
                <div className='aligncenter font16' style={{ fontWeight: 500 }}>
                  流失预测分析
                </div>
                <div className='aligncenter mg2t'>计算和分析过往用户流失情况，找出流失规律，预测未来用户的流失情况！</div>
              </div>
            </div>

            <div
              className='aligncenter pd3y bordert bg-light-blue'
              style={{
                height: 'calc(100% - 80px)'
              }}
            >
              <Row gutter={80} style={{ width: '85%', margin: '0 auto' }}>
                <Col span={8}>
                  <Rect className='border relative bg-white' style={{ height: 'calc(100% - 40px)' }}>
                    <img className='center-of-relative' style={guideIconStyle} src={guideIcon1} alt='' />
                  </Rect>
                  <div className='mg2t font16'>导入上月流失数据</div>
                </Col>

                <Col span={8}>
                  <Rect className='border relative width-100 bg-white' style={{ height: 'calc(100% - 40px)' }}>
                    <img className='center-of-relative' style={guideIconStyle} src={guideIcon2} alt='' />
                  </Rect>
                  <div className='mg2t font16'>生成用户流失预警分析模型</div>
                </Col>

                <Col span={8}>
                  <Rect className='border relative bg-white' style={{ height: 'calc(100% - 40px)' }}>
                    <img className='center-of-relative' style={guideIconStyle} src={guideIcon3} alt='' />
                  </Rect>
                  <div className='mg2t font16'>预测下个月用户流失数据</div>
                </Col>
              </Row>
            </div>
          </div>

          <div>
            <div className='height80 relative'>
              <div className='center-of-relative'>
                <div className='aligncenter font16' style={{ fontWeight: 500 }}>
                  导入数据
                </div>
                <div className='aligncenter mg2t'>快速导入离线数据, 获取预警分析字段！</div>
              </div>
            </div>
            <div className='bordert bg-light-blue pd1 mg3t aligncenter' style={{ height: 'calc(100% - 80px - 30px)' }}>
              <ImgInLink className='height-100 finline' src='/_bc/sugo-analytics-static/assets/images/loss-predict-guide-01-import-data.jpg' alt='' />
            </div>
          </div>

          <div>
            <div className='height80 relative'>
              <div className='center-of-relative'>
                <div className='aligncenter font16' style={{ fontWeight: 500 }}>
                  生成模型
                </div>
                <div className='aligncenter mg2t'>快速勾选训练字段，一键生成预警模型！</div>
              </div>
            </div>

            <div className='bordert bg-light-blue pd1 mg3t aligncenter' style={{ height: 'calc(100% - 80px - 30px)' }}>
              <ImgInLink className='height-100 finline' src='/_bc/sugo-analytics-static/assets/images/loss-predict-guide-02-generate-model.jpg' alt='' />
            </div>
          </div>

          <div>
            <div className='height80 relative'>
              <div className='center-of-relative'>
                <div className='aligncenter font16' style={{ fontWeight: 500 }}>
                  加入预测
                </div>
                <div className='aligncenter mg2t'>快速导入预测数据，一键运行预测数据！</div>
              </div>
            </div>

            <div className='bordert bg-light-blue pd1 mg3t aligncenter' style={{ height: 'calc(100% - 80px - 30px)' }}>
              <ImgInLink className='height-100 finline' src='/_bc/sugo-analytics-static/assets/images/loss-predict-guide-03-do-predict.jpg' alt='' />
            </div>
          </div>

          <div>
            <div className='height80 relative'>
              <div className='center-of-relative'>
                <div className='aligncenter font16' style={{ fontWeight: 500 }}>
                  得出结果
                </div>
                <div className='aligncenter mg2t'>快速导入预测数据，一键运行预测数据！</div>
              </div>
            </div>

            <div className='bordert bg-light-blue pd1 mg3t aligncenter' style={{ height: 'calc(100% - 80px - 30px)' }}>
              <ImgInLink className='height-100 finline' src='/_bc/sugo-analytics-static/assets/images/loss-predict-guide-04-view-predict-results.jpg' alt='' />
            </div>
          </div>
        </Carousel>

        <div className='relative height70 bordert'>
          <div className='center-of-relative'>
            <Button
              className={classNames('pd3x', { hide: currentSlide === 0 })}
              size='large'
              onClick={() => {
                this.goToSlide(currentSlide - 1)
              }}
            >
              上一步
            </Button>

            <Button className={classNames('pd3x mg2x')} type='success' size='large' onClick={this.onClickNextButton}>
              {currentSlide === 4 ? '完成引导' : '下一步'}
            </Button>
          </div>
        </div>
      </Modal>
    )
  }
}

export default LossGuideModal
