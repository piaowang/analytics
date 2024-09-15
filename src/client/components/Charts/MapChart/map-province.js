/**
 * 省份和省份json名字对应关系
 */

/*
anhui.json          guizhou.json       liaoning.json   tianjin.json
aomen.json          hainan.json        neimenggu.json  world.json
beijing.json        hebei.json         ningxia.json    xianggang.json
china.json          heilongjiang.json  qinghai.json    xinjiang.json
chongqing.json      henan.json         shandong.json   xizang.json
city-position.json  hubei.json         shanghai.json   yunnan.json
fujian.json         hunan.json         shanxi1.json    zhejiang.json
gansu.json          jiangsu.json       shanxi.json
guangdong.json      jiangxi.json       sichuan.json
guangxi.json        jilin.json         taiwan.json
*/
let str = `北京 BeiJing
上海 ShangHai
天津 TianJin
重庆 ChongQing
香港 XiangGang
澳门 Aomen
安徽 AnHui
福建 FuJian
广东 GuangDong
广西 GuangXi
贵州 GuiZhou
甘肃 GanSu
海南 HaiNan
河北 HeBei
河南 HeNan
黑龙江 HeiLongJiang
湖北 HuBei
湖南 HuNan
吉林 JiLin
江苏 JiangSu
江西 JiangXi
辽宁 LiaoNing
内蒙古 NeiMengGu
宁夏 NingXia
青海 QingHai
陕西 ShanXi1
山西 ShanXi
山东 ShanDong
四川 SiChuan
台湾 TaiWan
西藏 XiZang
新疆 XinJiang
云南 YunNan
浙江 ZheJiang`

export default str.split('\n')
  .reduce((prev, d) => {
    let [name, pin] = d.split(' ')
    return {
      ...prev,
      [name]: pin.toLowerCase()
    }
  }, {})

export const reflect = str.split('\n')
  .reduce((prev, d) => {
    let [name, pin] = d.split(' ')
    return {
      ...prev,
      [pin.toLowerCase()]: name
    }
  }, {})
