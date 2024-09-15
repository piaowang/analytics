/**
 * 构建uindex维度名称
 *
  前缀	类型	值	例子
  i	int类型	单值	i_age
  mi	int类型	多值	mi_num
  l	long类型	单值	l_duration
  ml	long类型	多值	ml_timestamp
  f	float类型	单值	f_avg
  mf	float类型	多值	mf_score
  d	double类型	单值	d_value
  md	double类型	多值	md_value
  s	string类型	单值	s_name
  ms	string类型	多值	ms_name
 */

export default (name, type) => {
  //0=Long,1=Float,2=String,3=DateString;4=Date;5=Integer;6=TEXT;7=DOUBLE;8=BIGDECIMAL
  const typeMap = {
    0: 'l',
    1: 'f',
    2: 's',
    3: 's',
    4: 'd',
    5: 'i',
    6: 's',
    7: 'p',
    8: 'p',

    100: 'ml',
    101: 'mf',
    102: 'ms',
    104: 'md',
    105: 'mi',
    107: 'mp'
  }
  return (typeMap[parseInt(type, 10)] || '') + '_' + name
}
