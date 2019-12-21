const { wrapAsync } = require('../services/router.service');
const { downloadContent } = require('../services/manager-comm.service');

module.exports = (router) => {
  router.post('/movies', wrapAsync(async (req, res) => {
    const token = req.body.token;
    await downloadContent(token, 'movie');

    res.send("ok");
  }));

  // These should be POST requests probably
  router.post('/seasons', wrapAsync(async (req, res) => {
    const token = req.body.token;
    await downloadContent(token, 'season');

    res.send("ok");
  }));
};
