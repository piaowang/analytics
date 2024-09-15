import _ from 'lodash'

export const OfflineCalcModelParams = {
  filters: [],
  idxDeps: [],
  calcType: 'Select',
  tableDeps: [
    // qGMXBdrDa,
    // ln5i5BIeb
  ],
  hiveDbName: 'default',
  outputCols: [
    // {
    //   dimId: qGMXBdrDa/id
    // }
  ],
  Institution: '',// qGMXBdrDa / name,
  diagramInfo: {
    tables: [
      // {
      //   id: qGMXBdrDa,
      //   name: community,
      //   title: 社区数据,
      //   fields: [
      //     {
      //       type: NUMBER,
      //       field: id
      //     },
      //     {
      //       type: STRING,
      //       field: name
      //     }
      //   ],
      //   position: {
      //     x: 270,
      //     y: 230
      //   }
      // },

    ],
    joinLinks: [
      // {
      //   type: innerJoin,
      //   source: qGMXBdrDa/id,
      //   target: ln5i5BIeb/community_id
      // }
    ]
  },
  scheduleCron: null,
  outputTargetType: '',
  hivePrefixSettings: '\n-- for debug: 使用本地跑作业，不用去申请spark资源（需要1分钟左右）\nset mapreduce.framework.name = local;\nset hive.execution.engine=mr;\nset hive.exec.compress.output=false;\n',
  supervisorDepartments: []
}


export const resolveAllDimDepsOfIndex = (idx, idxIdDict) => {
  if (!idx) {
    return []
  }
  let {dimDeps, idxDeps} = idx.formula_info || {}
  return [...dimDeps, ..._.flatMap(idxDeps, idxId => resolveAllDimDepsOfIndex(idxIdDict[idxId], idxIdDict))]
}
