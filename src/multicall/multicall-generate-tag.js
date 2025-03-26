/**
 * @public
 * @returns {string}
 */
export const multicallGenerateTag = () =>
  `tag:${Date.now()}:${crypto.randomUUID()}`;
