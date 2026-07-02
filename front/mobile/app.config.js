import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  extra: {
    backendUrl: process.env.BACKEND_URL,
    dropboxApiKey: process.env.DROPBOX_API_KEY,
    eas: {
      projectId: "2ab9e73c-2017-467b-87c4-d969765dd9c0"
    }
  },
});
