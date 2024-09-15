// Grid static options.
export const layoutOptions = {
  dragReleaseDuration: 400,
  dragSortHeuristics: {
    sortInterval: 60
  },
  layoutDuration: 400,
  dragReleseEasing: "ease",
  layoutEasing: "ease",
  dragContainer: document.getElementById('portal-application-manager'),
  // The placeholder of an item that is being dragged.
  dragPlaceholder: {
    enabled: false,
    duration: 400,
    createElement: function(item) {
      return item.getElement().cloneNode(true);
    }
  }
};
