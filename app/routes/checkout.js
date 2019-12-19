const { wrapAsync } = require('../services/router.service');
const { Worker } = require('worker_threads');
const { downloadContent } = require('../services/manager-comm.service');

module.exports = (router) => {
  router.post('/movies', wrapAsync(async (req, res) => {
    const token = req.body.token;
    await downloadContent(token, 'movies');
    // Create "pending" db record
    // Listen for download status updates
    // Listen for finished and remove pending record + update local_tv_ tables
    // Return after pending db records have been created
    res.send("ok");
  }));

  // These should be POST requests probably
  router.post('/shows', wrapAsync(async (req, res) => {
    const token = req.body.token;
    await downloadContent(token, 'shows');
    // Create "pending" db record
    // Listen for download status updates
    // Listen for finished and remove pending record + update local_tv_ tables
    // Return after pending db records have been created
    res.send("ok");
  }));
};
