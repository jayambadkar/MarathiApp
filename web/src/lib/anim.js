// ESM wrapper around the offline animation kit (../assets/anim.js).
// The legacy script attaches itself to window.MarathiAnim; this module
// re-exports that handle for React components.
import "../assets/anim.js";

export function getAnim() {
  if (typeof window !== "undefined" && window.MarathiAnim) return window.MarathiAnim;
  return null;
}

export default getAnim;
