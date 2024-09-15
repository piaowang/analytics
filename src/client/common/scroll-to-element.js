
export function scrollToElement(elem, container) {
  if (!container) {
    // base on window
    let pos = elem.getBoundingClientRect().top + (window.scrollY || 0)
    window.scrollY = pos
    return
  }

  let pos = elem.getBoundingClientRect().top + (container.scrollTop || 0)
  container.scrollTop = pos
}
