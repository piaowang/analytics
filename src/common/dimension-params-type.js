/**
 * Created by heganjie on 2017/5/31.
 * 复合维度中用到的维度类型
 */

// 复合维度的类型（SugoDimensions.params.type）
export const DimensionParamsTypes = {
  calc: 'calc',
  group: 'group',
  cast: 'cast',
  business: 'business'
}


// 维度类型的枚举与翻译
export const dimensionParamTypes = {
  normal: {
    type: 'normal',
    name: '普通维度'
  },
  calc: {
    type: 'calc',
    name: '计算维度'
  },
  group: {
    type: 'group',
    name: '分组维度'
  },
  cast: {
    type: 'cast',
    name: '类型转换维度'
  },
  business: {
    type: 'business',
    name: '业务表维度'
  }
}

export const offlineCalcDimensionParamTypes = {
  normal: {
    type: 'normal',
    name: '普通维度'
  },
  calc: {
    type: 'calc',
    name: '衍生维度'
  }
}

