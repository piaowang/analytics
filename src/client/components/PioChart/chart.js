/* * @Author: xuxinjiang * @Date: 2020-07-07 14:11:22 * @LastEditors: your name * @LastEditTime: 2020-07-07 16:20:41 * @Description: file content */ /* * @Author: xuxinjiang * @Date: 2020-07-07 14:11:22 * @LastEditors: your name * @LastEditTime: 2020-07-07 16:16:40 * @Description: file content */

export default {
  treeData: {
    name: '决策树',
    children: [
      {
        name: '花瓣长度',
        children: [
          { name: '≤ 2.45', children: [{ name: '0', value: 0 }] },
          {
            name: '> 2.45',
            children: [
              {
                name: '花瓣宽度',
                children: [
                  {
                    name: '≤ 1.75',
                    children: [
                      {
                        name: '花瓣长度',
                        children: [
                          {
                            name: '≤ 5.35',
                            children: [
                              {
                                name: '花瓣长度',
                                children: [
                                  {
                                    name: '≤ 4.95',
                                    children: [{ name: '1', value: 1 }]
                                  },
                                  {
                                    name: '> 4.95',
                                    children: [
                                      {
                                        name: '花瓣宽度',
                                        children: [
                                          {
                                            name: '> 1.55',
                                            children: [{ name: '1', value: 1 }]
                                          },
                                          {
                                            name: '≤ 1.55',
                                            children: [{ name: '2', value: 2 }]
                                          }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            ]
                          },
                          {
                            name: '> 5.35',
                            children: [{ name: '2', value: 2 }]
                          }
                        ]
                      }
                    ]
                  },
                  { name: '> 1.75', children: [{ name: '2', value: 2 }] }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  rondom: {
    children: [
      {
        children: [
          {
            children: [
              {
                children: [
                  {
                    children: [
                      {
                        children: [
                          {
                            children: [
                              {
                                children: [{ name: '2', value: '2' }],
                                name: '> 1.75'
                              },
                              {
                                children: [
                                  {
                                    children: [
                                      {
                                        children: [{ name: '1', value: '1' }],
                                        name: '> 1.55'
                                      },
                                      {
                                        children: [{ name: '2', value: '2' }],
                                        name: ' 1.55'
                                      }
                                    ],
                                    name: '花瓣宽度'
                                  }
                                ],
                                name: ' 1.75'
                              }
                            ],
                            name: '花瓣宽度'
                          }
                        ],
                        name: '> 4.75'
                      },
                      { children: [{ name: '1', value: '1' }], name: ' 4.75' }
                    ],
                    name: '花瓣长度'
                  }
                ],
                name: '> 2.45'
              },
              { children: [{ name: '0', value: '0' }], name: ' 2.45' }
            ],
            name: '花瓣长度'
          }
        ],
        name: '1'
      },
      {
        children: [
          {
            children: [
              {
                children: [
                  {
                    children: [
                      { children: [{ name: '2', value: '2' }], name: '> 4.75' },
                      { children: [{ name: '1', value: '1' }], name: ' 4.75' }
                    ],
                    name: '花瓣长度'
                  }
                ],
                name: '> 2.5999999999999996'
              },
              {
                children: [{ name: '0', value: '0' }],
                name: ' 2.5999999999999996'
              }
            ],
            name: '花瓣长度'
          }
        ],
        name: '2'
      },
      {
        children: [
          {
            children: [
              {
                children: [
                  {
                    children: [
                      {
                        children: [{ name: '2', value: '2' }],
                        name: '> 1.7000000000000002'
                      },
                      {
                        children: [
                          {
                            children: [
                              {
                                children: [{ name: '2', value: '2' }],
                                name: '> 5'
                              },
                              {
                                children: [{ name: '1', value: '1' }],
                                name: ' 5'
                              }
                            ],
                            name: '花瓣长度'
                          }
                        ],
                        name: ' 1.7000000000000002'
                      }
                    ],
                    name: '花瓣宽度'
                  }
                ],
                name: '> 2.5999999999999996'
              },
              {
                children: [{ name: '0', value: '0' }],
                name: ' 2.5999999999999996'
              }
            ],
            name: '花瓣长度'
          }
        ],
        name: '3'
      },
      {
        children: [
          {
            children: [
              {
                children: [
                  {
                    children: [
                      {
                        children: [
                          {
                            children: [
                              {
                                children: [{ name: '2', value: '2' }],
                                name: '> 5.95'
                              },
                              {
                                children: [
                                  {
                                    children: [
                                      {
                                        children: [{ name: '1', value: '1' }],
                                        name: '> 5.85'
                                      },
                                      {
                                        children: [{ name: '2', value: '2' }],
                                        name: ' 5.85'
                                      }
                                    ],
                                    name: '花萼长度'
                                  }
                                ],
                                name: ' 5.95'
                              }
                            ],
                            name: '花萼长度'
                          }
                        ],
                        name: '> 1.75'
                      },
                      {
                        children: [
                          {
                            children: [
                              {
                                children: [
                                  {
                                    children: [
                                      {
                                        children: [{ name: '1', value: '1' }],
                                        name: '> 1.55'
                                      },
                                      {
                                        children: [{ name: '2', value: '2' }],
                                        name: ' 1.55'
                                      }
                                    ],
                                    name: '花瓣宽度'
                                  }
                                ],
                                name: '> 4.95'
                              },
                              {
                                children: [{ name: '1', value: '1' }],
                                name: ' 4.95'
                              }
                            ],
                            name: '花瓣长度'
                          }
                        ],
                        name: ' 1.75'
                      }
                    ],
                    name: '花瓣宽度'
                  }
                ],
                name: '> 2.45'
              },
              { children: [{ name: '0', value: '0' }], name: ' 2.45' }
            ],
            name: '花瓣长度'
          }
        ],
        name: '4'
      },
      {
        children: [
          {
            children: [
              {
                children: [
                  {
                    children: [
                      { children: [{ name: '2', value: '2' }], name: '> 4.95' },
                      {
                        children: [
                          {
                            children: [
                              {
                                children: [
                                  {
                                    children: [
                                      {
                                        children: [
                                          {
                                            children: [
                                              {
                                                children: [
                                                  { name: '1', value: '1' }
                                                ],
                                                name: '> 6.25'
                                              },
                                              {
                                                children: [
                                                  {
                                                    children: [
                                                      {
                                                        children: [
                                                          {
                                                            name: '2',
                                                            value: '2'
                                                          }
                                                        ],
                                                        name: '> 6'
                                                      },
                                                      {
                                                        children: [
                                                          {
                                                            name: '1',
                                                            value: '1'
                                                          }
                                                        ],
                                                        name: ' 6'
                                                      }
                                                    ],
                                                    name: '花萼长度'
                                                  }
                                                ],
                                                name: ' 6.25'
                                              }
                                            ],
                                            name: '花萼长度'
                                          }
                                        ],
                                        name: '> 5.75'
                                      },
                                      {
                                        children: [{ name: '2', value: '2' }],
                                        name: ' 5.75'
                                      }
                                    ],
                                    name: '花萼长度'
                                  }
                                ],
                                name: '> 4.75'
                              },
                              {
                                children: [{ name: '1', value: '1' }],
                                name: ' 4.75'
                              }
                            ],
                            name: '花瓣长度'
                          }
                        ],
                        name: ' 4.95'
                      }
                    ],
                    name: '花瓣长度'
                  }
                ],
                name: '> 2.45'
              },
              { children: [{ name: '0', value: '0' }], name: ' 2.45' }
            ],
            name: '花瓣长度'
          }
        ],
        name: '5'
      },
      {
        children: [
          {
            children: [
              {
                children: [
                  {
                    children: [
                      { children: [{ name: '2', value: '2' }], name: '> 4.85' },
                      {
                        children: [
                          {
                            children: [
                              {
                                children: [{ name: '1', value: '1' }],
                                name: '> 4.95'
                              },
                              {
                                children: [
                                  {
                                    children: [
                                      {
                                        children: [{ name: '2', value: '2' }],
                                        name: '> 3.9'
                                      },
                                      {
                                        children: [{ name: '1', value: '1' }],
                                        name: ' 3.9'
                                      }
                                    ],
                                    name: '花瓣长度'
                                  }
                                ],
                                name: ' 4.95'
                              }
                            ],
                            name: '花萼长度'
                          }
                        ],
                        name: ' 4.85'
                      }
                    ],
                    name: '花瓣长度'
                  }
                ],
                name: '> 2.45'
              },
              { children: [{ name: '0', value: '0' }], name: ' 2.45' }
            ],
            name: '花瓣长度'
          }
        ],
        name: '6'
      },
      {
        children: [
          {
            children: [
              {
                children: [
                  {
                    children: [
                      { children: [{ name: '2', value: '2' }], name: '> 5.15' },
                      { children: [{ name: '1', value: '1' }], name: ' 5.15' }
                    ],
                    name: '花瓣长度'
                  }
                ],
                name: '> 2.45'
              },
              { children: [{ name: '0', value: '0' }], name: ' 2.45' }
            ],
            name: '花瓣长度'
          }
        ],
        name: '7'
      },
      {
        children: [
          {
            children: [
              {
                children: [
                  {
                    children: [
                      { children: [{ name: '2', value: '2' }], name: '> 7.1' },
                      { children: [{ name: '1', value: '1' }], name: ' 7.1' }
                    ],
                    name: '花萼长度'
                  }
                ],
                name: '> 5.75'
              },
              {
                children: [
                  {
                    children: [
                      { children: [{ name: '0', value: '0' }], name: '> 3.05' },
                      {
                        children: [
                          {
                            children: [
                              {
                                children: [
                                  {
                                    children: [
                                      {
                                        children: [
                                          {
                                            children: [
                                              {
                                                children: [
                                                  { name: '1', value: '1' }
                                                ],
                                                name: '> 5.05'
                                              },
                                              {
                                                children: [
                                                  { name: '0', value: '0' }
                                                ],
                                                name: ' 5.05'
                                              }
                                            ],
                                            name: '花萼长度'
                                          }
                                        ],
                                        name: '> 4.95'
                                      },
                                      {
                                        children: [{ name: '2', value: '2' }],
                                        name: ' 4.95'
                                      }
                                    ],
                                    name: '花萼长度'
                                  }
                                ],
                                name: '> 4.85'
                              },
                              {
                                children: [{ name: '0', value: '0' }],
                                name: ' 4.85'
                              }
                            ],
                            name: '花萼长度'
                          }
                        ],
                        name: ' 3.05'
                      }
                    ],
                    name: '花萼宽度'
                  }
                ],
                name: ' 5.75'
              }
            ],
            name: '花萼长度'
          }
        ],
        name: '8'
      },
      {
        children: [
          {
            children: [
              {
                children: [
                  {
                    children: [
                      { children: [{ name: '2', value: '2' }], name: '> 4.75' },
                      {
                        children: [
                          {
                            children: [
                              {
                                children: [{ name: '2', value: '2' }],
                                name: '> 1.6'
                              },
                              {
                                children: [{ name: '1', value: '1' }],
                                name: ' 1.6'
                              }
                            ],
                            name: '花瓣宽度'
                          }
                        ],
                        name: ' 4.75'
                      }
                    ],
                    name: '花瓣长度'
                  }
                ],
                name: '> 2.45'
              },
              { children: [{ name: '0', value: '0' }], name: ' 2.45' }
            ],
            name: '花瓣长度'
          }
        ],
        name: '9'
      },
      {
        children: [
          {
            children: [
              {
                children: [
                  {
                    children: [
                      { children: [{ name: '2', value: '2' }], name: '> 1.75' },
                      { children: [{ name: '1', value: '1' }], name: ' 1.75' }
                    ],
                    name: '花瓣宽度'
                  }
                ],
                name: '> 0.8'
              },
              { children: [{ name: '0', value: '0' }], name: ' 0.8' }
            ],
            name: '花瓣宽度'
          }
        ],
        name: '10'
      }
    ],
    name: '随机森林'
  },
  scatter: [
    {
      name: 'setosa',
      type: 'scatter',
      data: [
        [1.4, 0.2],
        [1.4, 0.2],
        [1.3, 0.2],
        [1.5, 0.2],
        [1.4, 0.2],
        [1.7, 0.4],
        [1.4, 0.3],
        [1.5, 0.2],
        [1.4, 0.2],
        [1.5, 0.1],
        [1.5, 0.2],
        [1.6, 0.2],
        [1.4, 0.1],
        [1.1, 0.1],
        [1.2, 0.2],
        [1.5, 0.4],
        [1.3, 0.4],
        [1.4, 0.3],
        [1.7, 0.3],
        [1.5, 0.3],
        [1.7, 0.2],
        [1.5, 0.4],
        [1.0, 0.2],
        [1.7, 0.5],
        [1.9, 0.2],
        [1.6, 0.2],
        [1.6, 0.4],
        [1.5, 0.2],
        [1.4, 0.2],
        [1.6, 0.2],
        [1.6, 0.2],
        [1.5, 0.4],
        [1.5, 0.1],
        [1.4, 0.2],
        [1.5, 0.2],
        [1.2, 0.2],
        [1.3, 0.2],
        [1.4, 0.1],
        [1.3, 0.2],
        [1.5, 0.2],
        [1.3, 0.3],
        [1.3, 0.3],
        [1.3, 0.2],
        [1.6, 0.6],
        [1.9, 0.4],
        [1.4, 0.3],
        [1.6, 0.2],
        [1.4, 0.2],
        [1.5, 0.2],
        [1.4, 0.2]
      ]
    },
    {
      name: 'versicolor',
      type: 'scatter',
      data: [
        [4.7, 1.4],
        [4.5, 1.5],
        [4.9, 1.5],
        [4.0, 1.3],
        [4.6, 1.5],
        [4.5, 1.3],
        [4.7, 1.6],
        [3.3, 1.0],
        [4.6, 1.3],
        [3.9, 1.4],
        [3.5, 1.0],
        [4.2, 1.5],
        [4.0, 1.0],
        [4.7, 1.4],
        [3.6, 1.3],
        [4.4, 1.4],
        [4.5, 1.5],
        [4.1, 1.0],
        [4.5, 1.5],
        [3.9, 1.1],
        [4.8, 1.8],
        [4.0, 1.3],
        [4.9, 1.5],
        [4.7, 1.2],
        [4.3, 1.3],
        [4.4, 1.4],
        [4.8, 1.4],
        [5.0, 1.7],
        [4.5, 1.5],
        [3.5, 1.0],
        [3.8, 1.1],
        [3.7, 1.0],
        [3.9, 1.2],
        [5.1, 1.6],
        [4.5, 1.5],
        [4.5, 1.6],
        [4.7, 1.5],
        [4.4, 1.3],
        [4.1, 1.3],
        [4.0, 1.3],
        [4.4, 1.2],
        [4.6, 1.4],
        [4.0, 1.2],
        [3.3, 1.0],
        [4.2, 1.3],
        [4.2, 1.2],
        [4.2, 1.3],
        [4.3, 1.3],
        [3.0, 1.1],
        [4.1, 1.3]
      ]
    },
    {
      name: 'virginica',
      type: 'scatter',
      data: [
        [6.0, 2.5],
        [5.1, 1.9],
        [5.9, 2.1],
        [5.6, 1.8],
        [5.8, 2.2],
        [6.6, 2.1],
        [4.5, 1.7],
        [6.3, 1.8],
        [5.8, 1.8],
        [6.1, 2.5],
        [5.1, 2.0],
        [5.3, 1.9],
        [5.5, 2.1],
        [5.0, 2.0],
        [5.1, 2.4],
        [5.3, 2.3],
        [5.5, 1.8],
        [6.7, 2.2],
        [6.9, 2.3],
        [5.0, 1.5],
        [5.7, 2.3],
        [4.9, 2.0],
        [6.7, 2.0],
        [4.9, 1.8],
        [5.7, 2.1],
        [6.0, 1.8],
        [4.8, 1.8],
        [4.9, 1.8],
        [5.6, 2.1],
        [5.8, 1.6],
        [6.1, 1.9],
        [6.4, 2.0],
        [5.6, 2.2],
        [5.1, 1.5],
        [5.6, 1.4],
        [6.1, 2.3],
        [5.6, 2.4],
        [5.5, 1.8],
        [4.8, 1.8],
        [5.4, 2.1],
        [5.6, 2.4],
        [5.1, 2.3],
        [5.1, 1.9],
        [5.9, 2.3],
        [5.7, 2.5],
        [5.2, 2.3],
        [5.0, 1.9],
        [5.2, 2.0],
        [5.4, 2.3],
        [5.1, 1.8]
      ]
    }
  ]
}
