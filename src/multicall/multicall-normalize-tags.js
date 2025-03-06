/**
 * @public
 * @param {import('../../types/entities/index.js').MulticallTags} tags
 * @returns {import('../../types/entities/index.js').Tagable}
 */
export const multicallNormalizeTags = (tags) => {
  if (typeof tags === 'object' || Array.isArray(tags)) {
    return JSON.stringify(tags, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    );
  }
  return tags;
};
