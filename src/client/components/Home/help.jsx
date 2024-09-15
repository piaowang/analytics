//动态帮助链接
import linkMap from 'common/help-link-map'
import { docUrl } from './common'
import _ from 'lodash'
import { QuestionOutlined } from '@ant-design/icons'
import { Tooltip } from 'antd'
import { showHelpLink } from './common'
import { Anchor } from '../Common/anchor-custom'

export default function HelpLink(props) {
  if (!showHelpLink) return null
  let { pathname } = props.location
  let keys = Object.keys(linkMap)
  let key = _.find(keys, p => {
    return p.includes('startWith#') ? pathname.includes(p.split('startWith#')[1]) : pathname === p
  })
  let url = key ? `${docUrl}${linkMap[key]}` : docUrl
  return (
    <Tooltip title='查看帮助文档' placement='left'>
      <Anchor href={url} target='_blank' className='fixed-icon help-link-right'>
        <QuestionOutlined />
      </Anchor>
    </Tooltip>
  )
}
