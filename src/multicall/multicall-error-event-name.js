/**
 * @public
 * @param {import('../../types/entities/index.js').Tagable} normalizedTags
 * @returns {string}
 */
export const multicallErrorEventName = (normalizedTags) =>
  `error:${String(normalizedTags)}`;
