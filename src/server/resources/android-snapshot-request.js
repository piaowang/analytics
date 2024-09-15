export default {
  'type': 'snapshot_request',
  'payload': {
    'config': {
      'classes': [
        {
          'name': 'android.view.View',
          'properties': [
            {
              'name': 'importantForAccessibility',
              'get': {
                'selector': 'isImportantForAccessibility',
                'parameters': [],
                'result': {
                  'type': 'java.lang.Boolean'
                }
              }
            },
            {
              'name': 'clickable',
              'get': {
                'selector': 'isClickable',
                'parameters': [],
                'result': {
                  'type': 'java.lang.Boolean'
                }
              }
            },
            {
              'name': 'alpha',
              'get': {
                'selector': 'getAlpha',
                'parameters': [],
                'result': {
                  'type': 'java.lang.Float'
                }
              },
              'set': {
                'selector': 'setAlpha',
                'parameters': [
                  {
                    'type': 'java.lang.Float'
                  }
                ]
              }
            },
            {
              'name': 'hidden',
              'get': {
                'selector': 'getVisibility',
                'parameters': [],
                'result': {
                  'type': 'java.lang.Integer'
                }
              },
              'set': {
                'selector': 'setVisibility',
                'parameters': [
                  {
                    'type': 'java.lang.Integer'
                  }
                ]
              }
            },
            {
              'name': 'background',
              'get': {
                'selector': 'getBackground',
                'parameters': [],
                'result': {
                  'type': 'android.graphics.drawable.Drawable'
                }
              },
              'set': {
                'selector': 'setBackground',
                'parameters': [
                  {
                    'type': 'android.graphics.drawable.ColorDrawable'
                  }
                ]
              }
            }
          ]
        },
        {
          'name': 'android.support.v4.view.ViewPager',
          'properties': [{
            'name': 'mCurItem',
            'get': {
              'selector': 'getCurrentItem',
              'parameters': [],
              'result': {
                'type': 'java.lang.Integer'
              }
            }
          }]

        },
        {
          'name': 'android.widget.TextView',
          'properties': [
            {
              'name': 'importantForAccessibility',
              'get': {
                'selector': 'isImportantForAccessibility',
                'parameters': [],
                'result': {
                  'type': 'java.lang.Boolean'
                }
              }
            },
            {
              'name': 'clickable',
              'get': {
                'selector': 'isClickable',
                'parameters': [],
                'result': {
                  'type': 'java.lang.Boolean'
                }
              }
            },
            {
              'name': 'alpha',
              'get': {
                'selector': 'getAlpha',
                'parameters': [],
                'result': {
                  'type': 'java.lang.Float'
                }
              },
              'set': {
                'selector': 'setAlpha',
                'parameters': [
                  {
                    'type': 'java.lang.Float'
                  }
                ]
              }
            },
            {
              'name': 'hidden',
              'get': {
                'selector': 'getVisibility',
                'parameters': [],
                'result': {
                  'type': 'java.lang.Integer'
                }
              },
              'set': {
                'selector': 'setVisibility',
                'parameters': [
                  {
                    'type': 'java.lang.Integer'
                  }
                ]
              }
            },
            {
              'name': 'text',
              'get': {
                'selector': 'getText',
                'parameters': [],
                'result': {
                  'type': 'java.lang.CharSequence'
                }
              },
              'set': {
                'selector': 'setText',
                'parameters': [
                  {
                    'type': 'java.lang.CharSequence'
                  }
                ]
              }
            },
            {
              'name': 'textColor',
              'get': {
                'selector': 'getTextColors',
                'parameters': [],
                'result': {
                  'type': 'android.content.res.ColorStateList'
                }
              },
              'set': {
                'selector': 'setTextColor',
                'parameters': [
                  {
                    'type': 'java.lang.Integer'
                  }
                ]
              }
            },
            {
              'name': 'fontSize',
              'get': {
                'selector': 'getTextSize',
                'parameters': [],
                'result': {
                  'type': 'java.lang.Float'
                }
              },
              'set': {
                'selector': 'setTextSize',
                'parameters': [
                  {
                    'type': 'java.lang.Integer'
                  },
                  {
                    'type': 'java.lang.Float'
                  }
                ]
              }
            }
          ]
        },
        {
          'name': 'android.widget.ImageView',
          'properties': [
            {
              'name': 'importantForAccessibility',
              'get': {
                'selector': 'isImportantForAccessibility',
                'parameters': [],
                'result': {
                  'type': 'java.lang.Boolean'
                }
              }
            },
            {
              'name': 'clickable',
              'get': {
                'selector': 'isClickable',
                'parameters': [],
                'result': {
                  'type': 'java.lang.Boolean'
                }
              }
            },
            {
              'name': 'alpha',
              'get': {
                'selector': 'getAlpha',
                'parameters': [],
                'result': {
                  'type': 'java.lang.Float'
                }
              },
              'set': {
                'selector': 'setAlpha',
                'parameters': [
                  {
                    'type': 'java.lang.Float'
                  }
                ]
              }
            },
            {
              'name': 'hidden',
              'get': {
                'selector': 'getVisibility',
                'parameters': [],
                'result': {
                  'type': 'java.lang.Integer'
                }
              },
              'set': {
                'selector': 'setVisibility',
                'parameters': [
                  {
                    'type': 'java.lang.Integer'
                  }
                ]
              }
            },
            {
              'name': 'image',
              'get': {
                'selector': 'getDrawable',
                'parameters': [],
                'result': {
                  'type': 'android.graphics.drawable.Drawable'
                }
              },
              'set': {
                'selector': 'setImageDrawable',
                'parameters': [
                  {
                    'type': 'android.graphics.drawable.BitmapDrawable'
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  }
}
