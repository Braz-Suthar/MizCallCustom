export const turnConfig = {
    urls: process.env.TURN_URLS.split(","),
    username: process.env.TURN_USERNAME,
    credential: process.env.TURN_PASSWORD,
  };