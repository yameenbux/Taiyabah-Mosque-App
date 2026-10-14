/* AsyncStorage, in memory. metals.js remembers the last good price through it,
   and "yesterday's price rather than nothing" is a behaviour worth testing. */
const store = new Map();
export function __reset() { store.clear(); }
export default {
  async getItem(k) { return store.has(k) ? store.get(k) : null; },
  async setItem(k, v) { store.set(k, String(v)); },
  async removeItem(k) { store.delete(k); },
};
