// 静态测试数据
export const test_value = {
  tables: [
    {
      id: 'TBLMEMBER',
      name: 'TBLMEMBER',
      title: 'TBLMEMBER',
      fields: [
        { type: 'NUMBER', field: 'USERID' },
        { type: 'VARCHAR(100)', field: 'ACCOUNTNO' },
        { type: 'VARCHAR(100)', field: 'MEMBERTYPE' },
        { type: 'VARCHAR(1)', field: 'MEMBERSTATUS' }
      ],
      attrs: [
        { label: 'IP', value: '192.168.0.1' },
        { label: '数据库', value: '销售系统' },
        { label: 'Schema', value: 'SALUSER' },
        { label: '表', value: 'TBLMEMBER' }
      ],
      position: { x: 100, y: 40 }
    }, {
      id: 'TBLORDER',
      name: 'TBLORDER',
      title: 'TBLORDER',
      fields: [
        { type: 'NUMBER', field: 'ORDERNO' },
        { type: 'DATE', field: 'ORDERDATE' },
        { type: 'NUMBER', field: 'AMOUNT' },
        { type: 'VARCHAR(100)', field: 'APP_NUM', orig: 'APP_NUM' },
        { type: 'NUMBER', field: 'USERID' }
      ],
      attrs: [
        { label: 'IP', value: '192.168.0.1' },
        { label: '数据库', value: '销售系统' },
        { label: 'Schema', value: 'User1' },
        { label: '表', value: 'TBLORDER' }
      ],
      position: { x: 50, y: 350 }
    }, {
      id: 'TMP',
      name: 'TMP',
      title: 'TMP',
      fields: [
        { type: 'INT', field: 'FIELD1' },
        { type: 'STRING', field: 'FIELD2' },
        { type: 'STRING', field: 'FIELD3' },
        { type: 'STRING', field: 'FIELD4' },
        { type: 'STRING', field: 'FIELD5' },
        { type: 'STRING', field: 'FIELD6' },
        { type: 'STRING', field: 'FIELD7' },
        { type: 'STRING', field: 'COMN_ODR_APP_NUM', orig: 'APP_NUM' }
      ],
      attrs: [
        { label: 'IP', value: '192.168.0.1' },
        { label: '数据库', value: '销售系统' },
        { label: 'Schema', value: 'SALUSER' },
        { label: '表', value: 'TMP' }
      ],
      position: { x: 450, y: 20 }
    }, {
      id: 'standard',
      name: 'standard',
      title: '数据标准',
      fields: [
        { type: '', field: '订单申请序号', orig: 'APP_NUM' }
      ],
      attrs: [
        { label: '主题', value: '主题1' },
        { label: '大类', value: '大类1' },
        { label: '中类', value: '中类1' },
        { label: '小类', value: '小类1' }
      ],
      position: { x: 730, y: 450 }
    }, {
      id: 'SAL_COMN_ODR_APP_DTL',
      name: 'SAL_COMN_ODR_APP_DTL',
      title: 'SAL_COMN_ODR_APP_DTL',
      fields: [
        { type: 'INT', field: 'userid' },
        { type: 'STRING', field: 'accountno' },
        { type: 'STRING', field: 'membertype' },
        { type: 'STRING', field: 'memberstatus' },
        { type: 'STRING', field: 'orderno' },
        { type: 'STRING', field: 'orderdate' },
        { type: 'DOUBLE', field: 'amount' },
        {
          type: 'STRING', field: 'COMN_ODR_APP_NUM', orig: 'APP_NUM',
          info: [
            {
              title: '基本', content: [
                { label: '代码', value: 'COMN_ODR_APP_NUM' },
                { label: '名称', value: '普通订货申请单号' },
                { label: '描述', value: '普通订货申请单号 ' },
                { label: '元数据类型', value: '字段' },
                { label: '源创建时间', value: '2019-12-27 16:00:00' },
                { label: '源修改时间', value: '2019-12-27 16:00:00' },
                { label: '本地创建时间', value: '2019-12-27 16:00:00' },
                { label: '本地修改时间', value: '2019-12-27 16:00:00' }
              ]
            },
            {
              title: '特性', content: [
                { label: '字段ID', value: '0' },
                { label: '数据类型', value: 'STRING' },
                { label: '是否主键', value: '否' },
                { label: '字段长度', value: '100' }
              ]
            },
            {
              title: '关联', content: [
                { label: '数据标准', value: '普通订货申请单号' }
              ]
            }
          ]
        }
      ],
      attrs: [
        { label: 'IP', value: '192.168.0.101' },
        { label: '数据库', value: '大数据平台(HIVE)' },
        { label: 'Schema', value: 'hive' },
        { label: '表', value: 'SAL_COMN_ODR_APP_DTL' }
      ],
      info: [
        {
          title: '基本', content: [
            { label: '代码', value: 'SAL_COMN_ODR_APP_DTL' },
            { label: '名称', value: '普通订货申请明细信息' },
            { label: '描述', value: '普通订货申请明细信息......' },
            { label: '元数据类型', value: '表' },
            { label: '源创建时间', value: '2019-12-27 16:00:00' },
            { label: '源修改时间', value: '2019-12-27 16:00:00' },
            { label: '本地创建时间', value: '2019-12-27 16:00:00' },
            { label: '本地修改时间', value: '2019-12-27 16:00:00' }
          ]
        },
        {
          title: '特性', content: [
            { label: '是否分区', value: '是' },
            { label: '表空间', value: 'TABLE_SPACE' }
          ]
        },
        {
          title: '资源', content: [
            { label: '数据库', value: '销售系统' },
            { label: 'IP', value: '192.168.0.1' },
            { label: '数据库', value: '销售系统（ORACLE）' },
            { label: 'Schema', value: 'SALUSER' }
          ]
        }
      ],
      position: { x: 1024, y: 100 }
    }
  ],
  joinLinks: {
    table: [
      { type: 'none', source: 'TBLMEMBER/192.168.0.1/', target: 'TMP/192.168.0.1/' },
      { type: 'none', source: 'TBLORDER/192.168.0.1/', target: 'TMP/192.168.0.1/' },
      { type: 'none', source: 'TMP/192.168.0.1/', target: 'SAL_COMN_ODR_APP_DTL/192.168.0.101/' }
    ],
    field: [
      { type: 'deal', source: 'TBLMEMBER/USERID/', target: 'TMP/FIELD1/' },
      { type: 'no_deal', source: 'TBLMEMBER/ACCOUNTNO/', target: 'TMP/FIELD2/' },
      { type: 'no_deal', source: 'TBLMEMBER/MEMBERTYPE/', target: 'TMP/FIELD3/' },
      { type: 'no_deal', source: 'TBLMEMBER/MEMBERSTATUS/', target: 'TMP/FIELD4/' },

      { type: 'no_deal', source: 'TBLORDER/ORDERNO/', target: 'TMP/FIELD5/' },
      { type: 'no_deal', source: 'TBLORDER/ORDERDATE/', target: 'TMP/FIELD6/' },
      { type: 'no_deal', source: 'TBLORDER/AMOUNT/', target: 'TMP/FIELD7/' },
      {
        type: 'deal', source: 'TBLORDER/APP_NUM/APP_NUM', target: 'TMP/COMN_ODR_APP_NUM/APP_NUM', info: [
          {
            title: '基本', content: [
              { label: '代码', value: 'PROC_MEBER_OADER_LOAD' },
              { label: '名称', value: 'PROC_MEBER_OADER_LOAD' },
              { label: '描述', value: '合并会员信息至订单' },
              { label: '元数据类型', value: '存储过程' },
              { label: '源创建时间', value: '2019-12-27 16:00:00' },
              { label: '源修改时间', value: '2019-12-27 16:00:00' },
              { label: '本地创建时间', value: '2019-12-27 16:00:00' },
              { label: '本地修改时间', value: '2019-12-27 16:00:00' }
            ]
          },
          {
            title: '特性', content: [
              {
                label: '语句', value: `create or replace procedure PROC_MEBER_OADER_LOAD
          as
          begin
          create or replace procedure PROC_MEBER_OADER_LOAD
          as
          begin
          insert into TMP
           SSELECT TBLMEMBER.USERID,
           TBLMEMBER.ACCOUNTNO,
           TBLMEMBER.MEMBERTYPE,
           TBLMEMBER.MEMBERSTATUS,
           TBLORDER.ORDERNO,
           TBLORDER.ORDERDATE,
           TBLORDER.AMOUNT,
           TBLORDER.APP_NUM 
          FROM TBLMEMBER,TBLORDER 
          WHERE TBLMEMBER.USERID=TBLORDER.USERID
          end;`}
            ]
          },
          {
            title: '资源', content: [
              { label: '数据标准', value: '销售系统' }
            ]
          }
        ]
      },

      { type: 'no_deal', source: 'TMP/FIELD1/', target: 'SAL_COMN_ODR_APP_DTL/userid/' },
      { type: 'no_deal', source: 'TMP/FIELD2/', target: 'SAL_COMN_ODR_APP_DTL/accountno/' },
      { type: 'no_deal', source: 'TMP/FIELD3/', target: 'SAL_COMN_ODR_APP_DTL/membertype/' },
      { type: 'no_deal', source: 'TMP/FIELD4/', target: 'SAL_COMN_ODR_APP_DTL/memberstatus/' },
      { type: 'no_deal', source: 'TMP/FIELD5/', target: 'SAL_COMN_ODR_APP_DTL/orderno/' },
      { type: 'no_deal', source: 'TMP/FIELD6/', target: 'SAL_COMN_ODR_APP_DTL/orderdate/' },
      { type: 'no_deal', source: 'TMP/FIELD7/', target: 'SAL_COMN_ODR_APP_DTL/amount/' },
      { type: 'no_deal', source: 'TMP/COMN_ODR_APP_NUM/APP_NUM', target: 'SAL_COMN_ODR_APP_DTL/COMN_ODR_APP_NUM/APP_NUM' },

      { type: 'none', source: 'standard/订单申请序号/APP_NUM', target: 'SAL_COMN_ODR_APP_DTL/COMN_ODR_APP_NUM/APP_NUM' }
    ]
  },

  transform: { x: 72, y: 34 },
  scale: 0.9,
  selectedKey: null
}

export const ETL_type = {
  'none': '没有经过ETL处理',
  'deal': '经过了ETL处理',
  'no_deal': '经过了ETL,但未处理'
}

export const DISPLAY = [
  {id: 'system', value: '系统级'},
  {id: 'table', value: '表级'},
  {id: 'field', value: '字段级'}
]

export const attrs = {
  table: [
    {label: '代码', value: 'TABLE1'}
  ]
}

