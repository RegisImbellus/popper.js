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

// roughly: https://css-tricks.com/get-value-of-css-rotation-through-javascript/
function rotationFromMatrix(element) {
  if(element instanceof Element) {
    const style = (typeof window !== 'undefined' ? window : global).getComputedStyle(element, null);
    const transform = style.getPropertyValue('transform') ||
      style.getPropertyValue('-webkit-transform') ||
      style.getPropertyValue('-moz-transform') ||
      style.getPropertyValue('-ms-transform') ||
      style.getPropertyValue('-o-transform') ||
      null;
    if (transform !== undefined && transform !== null && transform !== 'none') {
      let values = transform.match(/(matrix\()(.*)\)/)[2]
      values = values.split(',')
      return Math.round(Math.atan2(Number(values[1]), Number(values[0])) * (180/Math.PI));
    }
  }
  return 0;
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
  
  // account for parent container  with `transform: scale(x)` #376 https://github.com/FezVrasta/popper.js/issues/376
  // TODO: does not position popper relative to a transform scaled sibling/
  const rotation = rotationFromMatrix(element);
  const axisInverted = rotation === 90 || rotation === 270;
  const scaleX = !axisInverted ? scaleInAxis(rect.width, element.offsetWidth) : scaleInAxis(rect.width, element.offsetHeight);
  const scaleY = !axisInverted ? scaleInAxis(rect.height, element.offsetHeight) : scaleInAxis(rect.height, element.offsetWidth);
  
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
