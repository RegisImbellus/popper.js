import getStyleComputedProperty from './getStyleComputedProperty';
import getBordersSize from './getBordersSize';
import getWindowSizes from './getWindowSizes';
import getScroll from './getScroll';
import getClientRect from './getClientRect';
import isIE from './isIE';

function scaleInAxis(renderedSize, originalSize) {
  // handle cases where sizes are close and offsetWidth can have rounding mismatches
  if ( Math.abs(originalSize - renderedSize) <= 0.5 ) { return 1; }
  // use comparitive sizes to derive a scale value
  const scale = Math.round(renderedSize) / originalSize;
  if (isNaN(scale)) { return 1; } // no scale for 0/0 sizes
  return scale;
}

/**
 * Get bounding client rect of given element
 * @method
 * @memberof Popper.Utils
 * @param {HTMLElement} element
 * @return {Object} client rect
 */
export default function getBoundingClientRect(element) {
  let rect = {};

  // IE10 10 FIX: Please, don't ask, the element isn't
  // considered in DOM in some circumstances...
  // This isn't reproducible in IE10 compatibility mode of IE11
  try {
    if (isIE(10)) {
      rect = element.getBoundingClientRect();
      const scrollTop = getScroll(element, 'top');
      const scrollLeft = getScroll(element, 'left');
      rect.top += scrollTop;
      rect.left += scrollLeft;
      rect.bottom += scrollTop;
      rect.right += scrollLeft;
    }
    else {
      rect = element.getBoundingClientRect();
    }
  }
  catch(e){}
  
  // WIP: account for transform: scale(x) https://github.com/FezVrasta/popper.js/issues/376#issuecomment-493609289
  // BUG: rotation will invalidate this, (because it changes getBoundingClientRect size)
  // TODO: add test for non-axis aligned rotation, e.g. 45 deg
  const scaleX = scaleInAxis(rect.width, element.offsetWidth);
  const scaleY = scaleInAxis(rect.height, element.offsetHeight);
  
  // TODO: add test for scaled up position
  // TODO: add test for scaled down position
  const scaledRect = {
    left: rect.left / scaleX,
    top: rect.top / scaleY,
    right: rect.right / scaleX,
    bottom: rect.bottom / scaleY,
  }

  const result = {
    left: scaledRect.left,
    top: scaledRect.top,
    width: scaledRect.right - scaledRect.left,
    height: scaledRect.bottom - scaledRect.top,
  };

  // subtract scrollbar size from sizes
  const sizes = element.nodeName === 'HTML' ? getWindowSizes(element.ownerDocument) : {};
  const width =
    sizes.width || element.clientWidth || result.width;
  const height =
    sizes.height || element.clientHeight || result.height;

  let horizScrollbar = element.offsetWidth - width;
  let vertScrollbar = element.offsetHeight - height;

  // if an hypothetical scrollbar is detected, we must be sure it's not a `border`
  // we make this check conditional for performance reasons
  if (horizScrollbar || vertScrollbar) {
    const styles = getStyleComputedProperty(element);
    horizScrollbar -= getBordersSize(styles, 'x');
    vertScrollbar -= getBordersSize(styles, 'y');

    result.width -= horizScrollbar;
    result.height -= vertScrollbar;
  }

  return getClientRect(result);
}