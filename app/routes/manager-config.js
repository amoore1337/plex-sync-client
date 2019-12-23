const { wrapAsync } = require('../services/router.service');
const { getManagerConfig, saveManagerConfig } = require('../services/manager-config.service');
const { savePlexConfig } = require('../services/plex-comm.service');

module.exports = (router) => {
  router.get('/', wrapAsync(async (_, res) => {
    const config = await getManagerConfig();
    res.json(config);
  }));

  router.post('/', wrapAsync(async (req, res) => {
    const hostname = req.body.hostname;
    const clientId = req.body.client_id;
    const clientSecret = req.body.client_secret;

    if (!(hostname && clientId && clientSecret)) {
      res.json({ error: 'hostname, client_id, and client_secret required.' }).status(422);
      return;
    }

    // TODO: This shouldn't be here...
    const plexHost = req.body.plex_hostname;
    const plexToken = req.body.plex_token;
    if (plexHost && plexToken) {
      await savePlexConfig(plexHost, plexToken);
    }

    await saveManagerConfig(hostname, clientId, clientSecret);
    res.json({ message: 'ok' });
  }));
};
