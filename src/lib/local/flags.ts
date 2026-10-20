/** Store uploaded images on local disk during development. */
export function isLocalImageMode(): boolean {
  return process.env.PANTAKER_IMAGE_MODE === "local";
}
