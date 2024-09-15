import { NotificationOutlined } from '@ant-design/icons';

export default function Alert (props) {

  return (
    <div
      className="common-alert"
      style={props.style}
    >
      <NotificationOutlined className="mg1r" />
      {props.msg === '查无数据' ? '系统数据维护中，请稍后再试' : props.msg}
    </div>
  );

}
