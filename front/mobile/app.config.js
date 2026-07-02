import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  extra: {
    backendUrl: process.env.BACKEND_URL,
    dropboxApiKey: process.env.DROPBOX_API_KEY
  },
});
