/**
 * @public
 * @param {string} name
 * @returns {string}
 */
export const contractCreateCallName = (name) =>
  `${name.startsWith('get') ? name : `get${name[0].toUpperCase()}${name.slice(1)}`}Call`;
