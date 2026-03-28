/**
 * React Native stub for react-dom.
 *
 * @react-aria/utils imports `flushSync` from react-dom for CSS animation handling
 * (in its animation.mjs / animation.main.js builds). That code path is unreachable
 * in React Native — it only runs inside a `getAnimations()` branch that requires
 * actual DOM nodes, which do not exist in React Native.
 *
 * We stub `flushSync` as a simple passthrough so Metro can resolve the module
 * without error. The real flushSync flushes pending React DOM renderer state
 * synchronously; React Native has no separate DOM renderer queue to flush.
 */
'use strict';

/**
 * @param {Function} callback
 * @returns {*}
 */
function flushSync(callback) {
  return callback();
}

module.exports = { flushSync };
