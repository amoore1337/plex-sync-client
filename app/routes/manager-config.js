const { wrapAsync } = require('../services/router.service');
const { getManagerConfig, saveManagerConfig } = require('../services/manager-config.service');
const { getPlexConfig, savePlexConfig } = require('../services/plex-comm.service');
const contentScan = require('../workers/content-scan');

module.exports = (router) => {
  router.get('/', wrapAsync(async (_, res) => {
    const managerConfig = await getManagerConfig();
    const plexConfig = await getPlexConfig();
    res.json({
      manager: managerConfig,
      plex: plexConfig,
    });
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
    await contentScan();
    res.json({ message: 'ok' });
  }));
};
