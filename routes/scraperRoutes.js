const express = require('express');
const router = express.Router();
const scraperController = require('../controllers/scraperController');
const { validate, scraperValidationSchemas } = require('../middlewares/validationMiddleware');

// Route to start a scraping job
router.post('/start', validate(scraperValidationSchemas.startScrape), scraperController.startScrapingJob);

// Route to get the status of a specific scraping job
router.get('/status/:jobId', scraperController.getScrapingJobStatus);

// Route to list recent scraping jobs
router.get('/jobs', scraperController.listScrapingJobs);

module.exports = router;
