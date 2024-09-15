/**
 * Created by heganjie on 2017/7/5.
 * 自助分析的向导的配置文件
 */

import { DefaultPlayer as Video } from 'react-html5video'
import { Anchor } from '../Common/anchor-custom'

export const GUIDE_VERSION = 1

export default function genGuideData(userGuide) {
  return [
    {
      modal: {
        title: <span className='font16 fw400'>多维分析</span>,
        content: <div className='font14 pd2'>快速实现数据可视化操作，通过拖拽式操作快速定制自己所需要的分析报表。每一个业务人员都具有多维分析的能力。</div>,
        showPrimaryBtn: true,
        showAlreadyReadBtn: true,
        wrapClassName: 'hide-modal-footer-line',
        primaryBtnText: '观看演示动画'
      }
    },
    {
      modal: {
        title: (
          <div className='font16 fw400'>
            <span className='color-purple mg1r fw900'>1/3</span>如何使用维度
          </div>
        ),
        width: '65%',
        footnotes: (
          <div className='font14 line-height24'>
            <p>1. 将维度拖到钉板或筛选框中，如使用维度“省份”进行过滤；</p>
            <p>2. 将维度拖到维度框中，如使用维度“省份”对数据进行分组展示结果；</p>
            <p>3. 将维度拖到数值框中，如使用维度“用户唯一ID”来统计用户ID的总数。</p>
          </div>
        ),
        content: (
          <div className='pd2 font14'>
            <Video key='1' autoPlay muted controls={['PlayPause', 'Seek', 'Time', 'Fullscreen']}>
              <source src={`${window.sugo.cdn}/_bc/sugo-analytics-static/assets/videos/analytic-guide-01.mp4`} type='video/mp4' />
            </Video>
          </div>
        ),
        showNextBtn: true,
        showAlreadyReadBtn2: true
      }
    },
    {
      modal: {
        title: (
          <div className='font16 fw400'>
            <span className='color-purple mg1r fw900'>2/3</span>选择统计的数值
          </div>
        ),
        width: '65%',
        footnotes: (
          <div className='font14 line-height24'>
            <p>将指标拖到数值框中，进行统计“用户唯一ID”“访客数”的数值。</p>
            <p>
              可到指标管理中
              <Anchor href={`/console/measure?id=${userGuide.props.dataSourceId}`} target='_blank' className='color-purple'>
                创建
              </Anchor>
              更多的指标进行统计分析。
            </p>
          </div>
        ),
        content: (
          <div className='pd2'>
            <Video key='2' autoPlay muted controls={['PlayPause', 'Seek', 'Time', 'Fullscreen']}>
              <source src={`${window.sugo.cdn}/_bc/sugo-analytics-static/assets/videos/analytic-guide-02.mp4`} type='video/mp4' />
            </Video>
          </div>
        ),
        showNextBtn: true,
        showAlreadyReadBtn2: true
      }
    },
    {
      modal: {
        title: (
          <div className='font16 fw400'>
            <span className='color-purple mg1r fw900'>3/3</span>选择图表类型后执行查询
          </div>
        ),
        width: '65%',
        footnotes: (
          <div className='font14 line-height24'>
            <p>1. 选择图表去展示您的数据，高亮的图表为此时可切换的类型</p>
            <p>2. 点击执行查询显示报表。</p>
          </div>
        ),
        content: (
          <div className='pd2'>
            <Video key='3' autoPlay muted controls={['PlayPause', 'Seek', 'Time', 'Fullscreen']}>
              <source src={`${window.sugo.cdn}/_bc/sugo-analytics-static/assets/videos/analytic-guide-03.mp4`} type='video/mp4' />
            </Video>
          </div>
        ),
        showNextBtn: true,
        nextBtnText: '再看一遍',
        showAlreadyReadBtn2: true
      }
    }
  ]
}
