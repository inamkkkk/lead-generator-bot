const express = require('express');
const router = express.Router();
const schedulerController = require('../controllers/schedulerController');

// Route to manually trigger the daily lead outreach job
router.post('/start-daily-job', schedulerController.triggerDailyJobManually);

// Route to get the status of the scheduler and last job
router.get('/status', schedulerController.getSchedulerAndJobStatus);

// Route to stop the daily scheduler
router.post('/stop', schedulerController.stopScheduler);

// Route to start the daily scheduler
router.post('/start', schedulerController.startScheduler);

module.exports = router;
