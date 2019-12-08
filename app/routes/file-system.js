const { wrapAsync } = require('../services/router.service');
const { getAvailableDriveSpace } = require('../services/file.service');

module.exports = (router) => {
  router.get('/stats', wrapAsync(async (_, res) => {
    const availableSpace = await getAvailableDriveSpace();
    res.json({ available_space: availableSpace });
  }));
};
