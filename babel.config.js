module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Prevent metro bundler from shutting down during inactivity
      [
        'module-resolver',
        {
          root: ['./'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        },
      ],
      ['react-native-worklets-core/plugin'],
    ],
    // Optimize for development stability
    env: {
      development: {
        plugins: [
          // Keep development server alive longer
          '@babel/transform-react-jsx-source',
        ],
      },
    },
  };
};
