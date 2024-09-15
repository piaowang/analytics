
const Left = (props) => {
  const { reportList } = window.sugo
  return (
    <div className="v-l-box">
      {reportList.map((v, index) => {
        return (
          <div 
            key={index} 
            className={(props.cur?.id === v.id) ? 'item on':'item'}
            onClick={()=>props.onChange(index)} 
          >
            {v.title}
          </div>
        )
      })}
    </div>
  )
}
export default Left
