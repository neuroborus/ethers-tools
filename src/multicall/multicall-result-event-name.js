/**
 * @public
 * @param {import('../../types/entities/index.js').Tagable} normalizedTags
 * @returns {string}
 */
export const multicallResultEventName = (normalizedTags) =>
  `result:${String(normalizedTags)}`;
