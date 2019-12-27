const axios = require('axios');
const { getManagerConfig } = require('./manager-config.service');


const fetchAccessTokenForManager = async function () {
  try {
    const managerClient = await getManagerConfig();
    if (!managerClient) { return; }
    const response = await axios.post(`${managerClient.hostname}/api/oauth`, {
      grant_type: 'client_credentials',
      client_id: managerClient.client_id,
      client_secret: managerClient.client_secret,
    });

    return response.data.access_token;
  } catch (error) {
    console.error(error);
  }
}

exports.fetchAccessTokenForManager = fetchAccessTokenForManager;
