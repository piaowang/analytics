/*
 * 智能分析
 */
import React from "react";
import {
  AreaChartOutlined,
  EditOutlined,
  PlayCircleOutlined,
  ApiOutlined
} from "@ant-design/icons";
import { Button, message, Badge, Tooltip, Select, Modal } from "antd";
import _ from "lodash";
import SettingModal from "./setting-modal";
import OperatorTree from "./operator-tree";
import * as ls from "../../common/localstorage";
import setStatePromise from "../../common/set-state-promise";
import ProjModal from "./proj-edit-modal";
import { browserHistory } from "react-router";
import ResultPanel from "./result-panel";
import OperatorCanvas from "./operator-canvas";
import { immutateUpdate } from "../../../common/sugo-utils";
import fetch from "../../common/fetch-final";
import ApiFrom from './api-from'

//每1.5秒更新项目信息
const loopTimer = 1500;
const { Option } = Select;

const statusMap = {
  success: "SUCCESS",
  fail: "FAILED",
  running: "RUNNING",
};

const statusBadgeMap = {
  SUCCESS: "success",
  default: "default",
  FAILED: "error",
  RUNNING: "processing",
};

const statusTextMap = {
  SUCCESS: "运行成功",
  default: "尚未运行",
  FAILED: "运行失败，试试修正算子设置和连线",
  RUNNING: "运行中",
};

const zoomOptions = [
  {
    title: "100%",
    value: "1.0",
  },
  {
    title: "80%",
    value: "0.8",
  },
  {
    title: "60%",
    value: "0.6",
  },
  {
    title: "40%",
    value: "0.4",
  },
  {
    title: "20%",
    value: "0.2",
  },
  {
    title: "200%",
    value: "2.0",
  },
];

const badgeStyle = {
  backgroundColor: "#fff",
  color: "#999",
  boxShadow: "0 0 0 1px #d9d9d9 inset",
};

@setStatePromise
export default class ProjForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      process: props.process,
      layouts: [],
      showEditModal: !props.process.name,
      zoom: "1.0",
      //this is init data for setting modal
      unitDataName: "",

      mainHeight: 800,
      hideLeftPanel: false,
      hideRightPanel: false,
      templateTypes: [],
      showApiModal:false,
      getForm:null
    };

    this.nextnextUnitDataId = null;
    this._runed = false;

    this.apiFromobj = new React.createRef()
  }

  async componentDidMount() {
    window.addEventListener("resize", this.onWindowResizeRef);
    this.onWindowResizeRef();
    this.layoutDom = document.getElementById("layout");
    this.layoutDom.addEventListener("click", () =>
      document.activeElement.blur()
    );
    if (
      this.state.showEditModal &&
      _.get(this, "props.location.query.type") === "1"
    ) {
      //创建模板的类型
      let res = await this.props.getTemplateType();
      this.setState({ templateTypes: res.result });
    }
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(nextProps.process, this.props.process)) {
      this.setStateLs({
        process: nextProps.process,
      });
    }
  }

  componentWillUnmount() {
    clearTimeout(this.loopHandler);
    window.removeEventListener("resize", this.onWindowResizeRef);
  }

  loopUpdateProcess = () => {
    const loop = () => {
      this.updateProjInfo();
      this.loopHandler = setTimeout(loop, loopTimer);
    };
    loop();
  };

  updateProjInfo = async () => {
    let { id } = this.state.process;
    let res = await this.props.getPioProjects({
      id,
    });
    if (!res) return;
    message.destroy();
    let process = res.result;
    let { status } = process;
    if (status === statusMap.fail) {
      clearTimeout(this.loopHandler);
      message.error("运行失败了，试试重设算子或者连线");
    } else if (status === statusMap.success) {
      clearTimeout(this.loopHandler);
      message.success("运行成功", 8);
    }

    this.setStateLs({
      process,
    });
  };

  getStateOperators = (process) => {
    process = process || this.state.process;
    return _.get(process, "rootOperator.execUnits[0].operators") || [];
  };

  onWindowResizeRef = _.throttle(() => {
    let mainHeight = window.innerHeight - 50 - 43 - 49;
    this.setStateLs({
      mainHeight,
    });
  }, 200);

  setStateLs = (data, cb) => {
    let st = _.cloneDeep(this.state);
    Object.assign(st, data);
    ls.set("current_proj", st);
    this.setState(data, cb);
  };

  setStateLsPromise = (data) => {
    return new Promise((resolve) => {
      this.setStateLs(data, resolve);
    });
  };

  handleEdit = async (data) => {
    let { id } = this.state.process;
    let res = null;
    if (!id) {
      let type = _.get(this, "props.location.query.type");
      if (type === "1") {
        res = await this.props.addTemplate(data);
      } else if (type === "2") {
        res = await this.props.addCase(data);
      } else if (type === "3") {
        data.caseId = _.get(this, "props.location.query.id");
        res = await this.props.cloneCase(data);
      } else {
        res = await this.props.addProjects(data);
      }
      if (!res) return;
      this.setStateLs({
        process: res.result,
        showEditModal: false,
      });
      let { projectId } = this.props.params;
      if (!projectId) {
        browserHistory.replace(`/console/pio-projects/${res.result.id}`);
      }
    } else {
      let res = await this.props.updateProjects(id, data);
      if (!res) return;
      let process = _.cloneDeep(this.state.process);
      Object.assign(process, data);
      this.setStateLs({
        process,
        showEditModal: false,
      });
    }
  };

  showEditModal = () => {
    this.setStateLs({
      showEditModal: true,
    });
  };

  cancelEditProj = () => {
    let { id } = this.state.process;
    this.hideEditModal();
    if (!id) {
      browserHistory.push("/console/pio-projects");
    }
  };

  hideEditModal = () => {
    this.setStateLs({
      showEditModal: false,
    });
  };

  updateOperator = async (operatorName, data) => {
    let processId = this.state.process.id;
    let res = await this.props.updateOperatorInfo(
      processId,
      operatorName,
      data
    );
    if (!res && !res.result) return;
    const op = res.result;
    const process = immutateUpdate(
      this.state.process,
      "rootOperator.execUnits[0].operators",
      (ops) => ops.map((o) => (o.name === op.name ? op : o))
    );
    this.setState({ process });
    return res;
  };

  showResult = (id) => {
    if (typeof id !== "string") id = null;
    this.resultPanel.show();
    this.resultPanel.getData(id, this._runed);
    this._runed = false;
  };

  getLog = (operatorId) => {
    const processId = this.state.process.id;
    return fetch.get("/app/proj/get-log", { processId, operatorId });
  };

  cloneOperator = async (id, data) => {
    let processId = this.state.process.id;
    let info = await this.props.cloneProcessOperator(processId, id, data);

    if (!info && !info.result) return;
    const newOperator = info.result;
    const process = immutateUpdate(
      this.state.process,
      "rootOperator.execUnits[0].operators",
      (ops) => ops.concat(newOperator)
    );
    this.setState({ process });
  };

  onChangeZoom = (zoom) => {
    this.setStateLs({
      zoom,
    });
  };

  delLink = async (link) => {
    let { id } = this.state.process;
    let res = await this.props.disConnect(id, link);
    return res;
  };

  delOperatorLinks = async (name) => {
    let { connections } = this.state.process;
    let toRemove = connections.filter((con) => {
      return con.fromOperator === name || con.toOperator === name;
    });

    for (let con of toRemove) {
      let res = await this.delLink(con);
      if (!res) return;
    }
  };

  delOperator = async (name) => {
    let { id } = this.state.process;
    let unitDataName = this.state.unitDataName;

    await this.delOperatorLinks(name);

    let op = this.getStateOperators().find((op) => op.name === name);
    //删除
    let res = await this.props.delProcessOperator(id, op);
    if (!res) return;

    //清理状态
    let process = _.cloneDeep(this.state.process);
    let operators = this.getStateOperators(process);

    _.remove(operators, (op) => op && op.name === name);
    this.setStateLs({
      process,
    });

    if (unitDataName === name) {
      this.closeSettingModal();
    }
  };

  openSettingModal = async (name) => {
    if (this.state.unitDataName === name) return;
    this.nextUnitDataId = name;

    let process = _.cloneDeep(this.state.process);

    let operators = this.getStateOperators(process);

    let op = operators.find((op) => op && op.name === name);
    let { id } = process;
    let query = {
      processId: id,
      operatorName: op.name,
      fullName: op.fullName, // 临时demo 加上去判断
    };

    let res = await this.props.getOperatorInfo(query);
    if (!res) return;
    let i = _.findIndex(operators, (o) => o.name === op.name);
    _.update(operators, `[${i}]`, () => res.result);
    this.setStateLs({
      process,
      unitDataName: name,
    });
  };

  closeSettingModal = () => {
    this.setStateLs({
      unitDataName: "",
    });
  };

  remoteUpdateConnections = async (oldConnections, newConnections) => {
    let toAdd = newConnections.filter((con) => {
      return !_.find(oldConnections, con);
    });

    let toRemove = oldConnections.filter((con) => {
      return !_.find(newConnections, con);
    });

    //return
    let { id } = this.state.process;
    let res;
    for (let conn of toAdd) {
      res = await this.props.connect(id, conn);
      if (!res) {
        return false;
      }
    }
    for (let conn of toRemove) {
      res = await this.props.disConnect(id, conn);
      if (!res) {
        return false;
      }
    }
    this.setState({
      process: res.result,
    });
    return res;
  };

  update = async (unit, data) => {
    let { id } = this.state.process;
    let res = await this.props.updateProcessOperator(id, unit.name, data);
    if (!res || (this.nextUnitDataId && this.nextUnitDataId !== unit.name))
      return;
    let process = _.cloneDeep(this.state.process);
    let operators = this.getStateOperators(process);
    let index = _.findIndex(operators, (e) => e.name === unit.name);
    _.update(operators, `[${index}]`, () => res.result);

    this.setStateLs(
      {
        process,
      },
      () => {
        this.openSettingModal(unit.name);
      }
    );
  };

  getLastOperator = () => {
    return _.last(this.state.process.rootOperator.execUnits[0].operators);
  };

  computePositionFromRect = (rect) => {
    let { x, y, offsetX, offsetY, dragStatX } = rect;
    return {
      xPos: x - offsetX - dragStatX,
      yPos: y - offsetY,
    };
  };

  computePosition = (rect) => {
    return rect
      ? this.computePositionFromRect(rect)
      : {
          xPos: 10,
          yPos: 10,
        };
  };

  addOperator = async (operator, rect) => {
    let processId = this.state.process.id;
    let { xPos, yPos } = this.computePosition(rect);

    let operatorType = operator.name;
    //todo add operator to ProjForm
    let operators = this.getStateOperators();
    let arr = operators.filter((o) => o.operatorType === operatorType);
    let fullName = operator.fullName + "_" + (arr.length + 1);
    let info = await this.props.addProcessOperator(processId, {
      operatorType,
      xPos,
      yPos,
      fullName,
    });

    // //get operator info
    if (!info) return;
    await this.setStateLsPromise({
      process: info.result,
    });

    let operatorInfo = this.getLastOperator();

    //使用默认值
    let data = operatorInfo.parameterTypes.reduce((prev, p) => {
      if (p.paramType === "param_type_boolean") {
        prev[p.key] = p.defaultValue ? true : false;
      } else if (
        typeof p.defaultValue !== "undefined" &&
        p.defaultValue !== null
      ) {
        prev[p.key] = p.defaultValue;
      }
      return prev;
    }, {});
    this.nextUnitDataId = operatorInfo.name;
    this.update(operatorInfo, data);
  };

  run = async (operatorId, runFrom) => {
    this._runed = true;
    if (typeof operatorId !== "string") {
      operatorId = null;
      runFrom = false;
    }
    await this.setStateLsPromise({
      running: true,
    });
    let { id } = this.state.process;
    let res = await this.props.run(id, operatorId, runFrom);
    await this.setStateLsPromise({
      running: false,
    });
    if (!res) return;
    this.setStateLs({
      process: res.result,
    });
    this.loopUpdateProcess();
    this.resultPanel.clearData();
    message.success("开始运行，稍后会显示运行结果，请等待", 4);
  };
  submitFrom = async ()=>{
    const formData = await this.getForm()
    const {user} = window.sugo
    const data = {
      ...formData,
      "registerUrl":"/pio/operator/results/805576cb-1dbf-4ca2-8418-cda3c6ef51e2/parallel_decision_tree-7d4d2fe1-fe9f-498c-8b7b-1816f2ddf569",
      "registerHost":"",
      "groupId": "1",
      "oauthType":"NO_OAUTH",
      "paramInfoList": null,
      "createUserId": user.id,
      "createUserName": user.username,
      "resultInfoList": null
    }
    const res =  await fetch.get("/app/pio/saveApi", data);
    if(res.code === 0){
      this.setState({
        showApiModal:false
      })
      message.success('操作成功')
      return false
    }
    message.error('操作失败')
  }
  renderRunButton = () => {
    let {
      running,
      process: { status },
    } = this.state;
    let loading = running || status === statusMap.running;
    return (
      <div className="fright">
        <Button
          type="ghost"
          icon={<PlayCircleOutlined />}
          onClick={this.run}
          disabled={loading}
          loading={loading}
        >
          运行
        </Button>
        {status === "SUCCESS" ? (
          <Button
            type="primary"
            icon={<AreaChartOutlined />}
            onClick={this.showResult}
            disabled={running}
            className="mg1l"
          >
            查看运行结果
          </Button>
        ) : null}

        <Button
          className='mg1l'
          icon={<ApiOutlined />}
          onClick={()=>{
            this.setState({
              showApiModal:true
            })
          }}
        >
          发布API
        </Button>
        {/* 发布api弹窗 */}
        <Modal
          title="发布API"
          visible={this.state.showApiModal}
          onOk={this.submitFrom}
          onCancel={()=>{
            this.setState({
              showApiModal:false
            })
          }}
          width={800}
        >
          <div>
            <ApiFrom ref={this.apiFromobj} setForm={(f)=>{
              this.getForm = f
            }}/>
          </div>
        </Modal>
      </div>
    );
  };

  renderControls = () => {
    let { zoom, process } = this.state;

    let { name, status, description } = process;
    let operators = _.get(process, "rootOperator.execUnits[0].operators") || [];
    let len = operators.filter((o) => o).length;
    let statusText =
      "[" + (statusTextMap[status] || statusTextMap.default) + "]";
    let processDesc = `${name}${description ? ":" + description : ""}`;
    let badgeStatus = statusBadgeMap[status] || statusBadgeMap.default;
    let badgeTitle = `项目有${len}个算子`;
    return (
      <div className="pio-controls pd2x">
        <div className="fix">
          <div className="fleft">
            <span className="iblock mg1r elli">
              <Tooltip title={statusText + " " + processDesc}>
                <span>
                  <Badge status={badgeStatus} />
                  <b className="mg1r">{name}</b>
                </span>
              </Tooltip>
              <Tooltip title={badgeTitle}>
                <Badge count={len} style={badgeStyle} />
              </Tooltip>
            </span>
            <Tooltip title="编辑项目名称和描述">
              <EditOutlined
                className="iblock pointer mg2r"
                onClick={this.showEditModal}
              />
            </Tooltip>
            <span className="iblock mg1r">缩放</span>
            <Select value={zoom} onChange={this.onChangeZoom}>
              {zoomOptions.map((z, i) => {
                let { value, title } = z;
                return (
                  <Option value={value} key={i + "_zoom_" + value}>
                    {title}
                  </Option>
                );
              })}
            </Select>
          </div>
          {this.renderRunButton()}
        </div>
      </div>
    );
  };

  toggleSide = (index) => {
    const { hideLeftPanel, hideRightPanel } = this.state;
    let newState = { hideLeftPanel, hideRightPanel };
    index === 0
      ? (newState.hideLeftPanel = !hideLeftPanel)
      : (newState.hideRightPanel = !hideRightPanel);
    this.setState(newState);
  };

  hideLeftPanel = () => this.toggleSide(1);
  hideRightPanel = () => this.toggleSide(0);

  render() {
    let {
      unitDataName,
      mainHeight,
      process,
      showEditModal,
      hideLeftPanel,
      hideRightPanel,
      zoom,
      templateTypes,
    } = this.state;

    let { operators } = this.props;

    let unitData =
      this.getStateOperators().find((o) => o.name === unitDataName) || {};

    let modalProps = {
      unitData,
      update: this.update,
      closeSettingModal: this.closeSettingModal,
      delOperator: this.delOperator,
      hide: this.hideLeftPanel,
      isHidden: hideRightPanel,
    };

    let mainStyle = {
      height: mainHeight,
    };
    let layoutStyle = {};
    hideLeftPanel ? (layoutStyle.marginLeft = "0px") : null;
    hideRightPanel ? (layoutStyle.marginRight = "0px") : null;

    let projProps = {
      ref: (ref) => (this.processModal = ref),
      handleEdit: this.handleEdit,
      process,
      visible: showEditModal,
      onCancel: this.cancelEditProj,
      templateTypes,
    };

    let operators1 = this.getStateOperators();
    let { connections } = this.state.process;
    return (
      <div id="pio" className="bg-white">
        <ProjModal {...projProps} />
        <div className="pio-layout">
          <OperatorTree
            operators={operators}
            addOperator={this.addOperator}
            hide={this.hideRightPanel}
            isHidden={hideLeftPanel}
          />

          <div className="pio-main" id="layout" style={layoutStyle}>
            {this.renderControls()}
            <div className="canvas-wrapper" style={mainStyle}>
              <OperatorCanvas
                operators={operators1}
                connections={connections}
                updateConnections={this.remoteUpdateConnections}
                updateOperator={this.updateOperator}
                deleteOperator={this.delOperator}
                editOperator={this.openSettingModal}
                settingOperator={unitDataName}
                zoom={zoom}
                onChangeZoom={this.onChangeZoom}
                id="pio-canvas"
                run={this.run}
                showResult={this.showResult}
                cloneOperator={this.cloneOperator}
                getLog={this.getLog}
              />
            </div>
          </div>
          <SettingModal {...modalProps} />
          <ResultPanel
            {...this.props}
            ref={(ref) => (this.resultPanel = ref)}
            process={process}
          />
        </div>
      </div>
    );
  }
}
