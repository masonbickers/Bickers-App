const { requireClerkReleaseConfig } = require('./scripts/clerk-release-config.cjs');
module.exports = ({ config }) => {
  requireClerkReleaseConfig(process.env, config);
  return ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ||
      config.android?.googleServicesFile ||
      "./google-services.json",
  },
  });
};
