
export function initProcess(name) {
  return {
    name: name || '',
    decsription: '',
    connections: [],
    rootOperator: {
      name: 'root',
      execUnits: [{operators: []}]
    }
  }
}
