// Minimal pass-through — serves static assets from the assets directory
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
