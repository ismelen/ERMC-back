export default ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins || []),
    'expo-sqlite',
  ],
  extra: {
    eas: {
      projectId: "2ab9e73c-2017-467b-87c4-d969765dd9c0"
    }
  },
});
