export function shouldCreateSale(prevState, nextState) {
  if (!nextState || nextState === 'Cancelado') return false
  if (!prevState || prevState === 'Cancelado') return false
  return prevState === 'Pendiente' && nextState !== 'Pendiente'
}
