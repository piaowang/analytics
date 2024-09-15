import React from 'react'
import { CopyOutlined, DeleteOutlined, DesktopOutlined, HighlightOutlined } from '@ant-design/icons'
import { Button, Switch, Modal } from 'antd'
import { Link } from 'react-router'
import UploadedImageViewer from '../Common/uploaded-image-viewer'
import { checkPermission } from '../../common/permission-control'
import classNames from 'classnames'
import { EXAMINE_STATUS, EXAMINE_STATUS_TRANSLATE, AUTHORIZATION_TYPE, AUTHORIZATION_PERMISSIONS_TYPE } from '../../../common/constants'

const canEdit = checkPermission('/app/livescreen/update')
const canCopy = checkPermission('/app/livescreen/copy/:livescreenId')
const canDelete = checkPermission('/app/livescreen/delete/:livescreenId')
/**
 * 实时大屏列表-单个大屏item
 *
 * @class ScreenItem
 * @extends {React.Component}
 */

export default class ScreenItem extends React.Component {

  handlrerecycle = () => {
    const { id, recycleLiveScreen, isPublish } = this.props
    Modal.confirm({
      title: '提示',
      content: '是否将大屏移入回收站？',
      maskClosable: true,
      onOk() {
        recycleLiveScreen({ id, isPublish })
      },
      onCancel() { }
    })
  }

  handlreduction = () => {
    const { id, reductionLiveScreen, isPublish } = this.props
    reductionLiveScreen({ id, isPublish })
  }

  handleDelete = () => {
    const { id, deleteLivescreen } = this.props
    Modal.confirm({
      title: '提示',
      content: '删除后无法恢复，确实删除？',
      maskClosable: true,
      onOk() {
        deleteLivescreen({ id })
      },
      onCancel() { }
    })
  }

  handleCopy = () => {
    const { id, copyLiveScreen } = this.props
    Modal.confirm({
      title: '提示',
      content: '确定复制？',
      maskClosable: true,
      onOk() {
        copyLiveScreen({ id })
      },
      onCancel() { }
    })
    // const { id, doCopyLiveScreen } = this.props
    // doCopyLiveScreen(id)
  }

  onShowGroupModal = () => {
    const { id, doGetGroupInfo } = this.props
    doGetGroupInfo(id)
    this.setState({ isGroupModal: true })
  }

  onMoveGroup = () => {
    const { form: { validateFields }, id, doMoveGroup, groupModalInfo } = this.props
    validateFields((err, val) => {
      if (err) return
      const { category_id } = val
      if (category_id === groupModalInfo.category_id) {
        this.setState({ isGroupModal: false })
      }
      doMoveGroup({ id, category_id }, () => {
        this.setState({ isGroupModal: false })
      })
    })
  }

  render() {
    const { id, title, changeState, cover_image_id, is_template, examineStatus, authorizationType, recycle, showEdit, created_by, isPublish = false, hideEdit = false } = this.props
    return (
      <div className="screen">
        <div className="image-wrap">
          {
            cover_image_id
              ?
              <UploadedImageViewer
                uploadedImageId={cover_image_id}
                className="screen_image"
              />
              : false
          }
          <div className="mask">
            {
              recycle
                ? (<React.Fragment>
                  <div className="edit-wrap">
                    <Button type="success" onClick={this.handlreduction} className="edit">还原</Button>
                  </div>
                  <div className={classNames('delete', { hide: !canDelete })} onClick={this.handleDelete}>
                    <DeleteOutlined />
                  </div>
                </React.Fragment>
                )
                : null
            }
            {
              canEdit
                && !recycle
                && examineStatus !== EXAMINE_STATUS.wait
                && (authorizationType === AUTHORIZATION_PERMISSIONS_TYPE.write || authorizationType === AUTHORIZATION_PERMISSIONS_TYPE.owner)
                && !isPublish
                ? (<Link to={`/console/livescreen/${id}`} className="edit-wrap">
                  <Button type={classNames('success')} className="edit">编辑</Button>
                </Link>)
                : null
            }
            {
              ((examineStatus !== EXAMINE_STATUS.wait
                && authorizationType === AUTHORIZATION_PERMISSIONS_TYPE.owner)
                || (isPublish && created_by === window.sugo.user.id))
                && canDelete
                && !recycle
                ?
                (<div className={classNames('delete')} onClick={this.handlrerecycle}>
                  <DeleteOutlined />
                </div>)
                : null
            }
          </div>
        </div>
        {
          authorizationType === AUTHORIZATION_PERMISSIONS_TYPE.write 
          || authorizationType === AUTHORIZATION_PERMISSIONS_TYPE.read 
            ? <div className="authorization-type-icon" >
              <div>授权</div>
            </div>
            : null 
        }
        {
          // authorizationType === AUTHORIZATION_PERMISSIONS_TYPE.read 
          //   ? <div className="authorization-type-icon" >
          //     <div>授权</div>
          //   </div>
          //   : null 
        }
        <div className="screen-bottom-wrap">
          <div className="screen_bottom" onClick={this.handleEdit}>
            {canEdit && examineStatus !== EXAMINE_STATUS.wait && authorizationType === 3 && !isPublish && !hideEdit? (<HighlightOutlined  onClick={() => changeState({ editLiveScreenVisible: true, editId: id })} />) : null}
            <div className="itblock">{title}</div>
          </div>
          <div className="screen-actions-box">
            <div className="screenActions">
              {
                !recycle
                  ? <div className={`screen-status ${examineStatus === EXAMINE_STATUS.failed ? 'color-red' : (examineStatus === EXAMINE_STATUS.pass ? 'color-green' : '')}`} >
                    {_.get(EXAMINE_STATUS_TRANSLATE, _.findKey(EXAMINE_STATUS, p => p === examineStatus), '')}
                  </div>
                  : <div className="screen-status">{isPublish ? '已发布' : ''}{is_template ? '大屏模板' : '大屏'}</div>
              }
              <ul className="clearfix">
                {canCopy && !is_template && !isPublish && !recycle ? (
                  <li onClick={this.handleCopy}>
                    <CopyOutlined />
                    <span>复制</span>
                  </li>
                ) : null}
                <li>
                  <DesktopOutlined />
                  <a href={`/livescreen/${id}${isPublish ? '?publish=1' : ''}`} target="blank" style={{ color: 'inherit' }}>
                    <span>预览</span>
                  </a>
                </li>
                {/*<li>
                  <Switch size="small" checked={is_published} onChange={this.handlePublish} />
                  <span>发布</span>
                </li>*/}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
