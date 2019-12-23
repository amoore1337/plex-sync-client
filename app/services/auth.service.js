const axios = require('axios');
const { getManagerConfig } = require('./manager-config.service');


const fetchAccessTokenForManager = async function () {
  const managerClient = await getManagerConfig();
  const response = await axios.post(`${managerClient.hostname}/api/oauth`, {
    grant_type: 'client_credentials',
    client_id: managerClient.client_id,
    client_secret: managerClient.client_secret,
  });

  return response.data.access_token;
}

exports.fetchAccessTokenForManager = fetchAccessTokenForManager;
