const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Increase timeout to prevent bundler from closing when idle
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Set longer timeout for requests
      req.setTimeout(300000); // 5 minutes
      res.setTimeout(300000); // 5 minutes
      return middleware(req, res, next);
    };
  }
};

// Prevent bundler from shutting down due to inactivity
config.resetCache = true;
config.watchFolders = [__dirname];

// Optimize for better performance during development
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true
    }
  }
};

module.exports = config;
