const { wrapAsync } = require('../services/router.service');
const { Worker } = require('worker_threads');
const { downloadContent } = require('../services/manager-comm.service');

module.exports = (router) => {
  router.post('/movies', wrapAsync(async (req, res) => {
    const token = req.body.token;
    await downloadContent(token);
    res.send("ok");
  }));

  // These should be POST requests probably
  router.get('/shows', wrapAsync(async (req, res) => {
    // Grab token from request
    const filePath = decodeURIComponent(req.query.file);
    // Call service to perform the following steps:
    // Create new worker thread to download content
    const worker = new Worker(require.resolve('../workers/download-content.js'), {
      workerData: { token: req.query.file }
    });
    // Create "pending" db record
    // Listen for download status updates
    // Listen for finished and remove pending record + update local_tv_ tables
    // Return after pending db records have been created
    worker.on('message', message => console.log("GOT MESSAGE: ", message));
    worker.on('exit', (code) => {
      console.log('DONE!! ', code);
    });
    res.send("OK");
  }));
};
