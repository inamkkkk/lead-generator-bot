const Job = require('../models/Job');
const Lead = require('../models/Lead');
const Log = require('../models/Log');
const { success, error } = require('../utils/apiResponse');
const appLogger = require('../utils/logger');

// @desc    Start a new scraping job
// @route   POST /api/scraper/start
// @access  Public (for internal bot use)
exports.startScrapingJob = async (req, res) => {
  try {
    const { sources, keywords, location, limit } = req.body;

    // Create a job entry in the database
    const newJob = await Job.create({
      jobType: 'scraper',
      status: 'in_progress',
      details: { sources, keywords, location, limit },
    });

    // Respond immediately to the client
    success(res, 202, 'Scraping job initiated.', { jobId: newJob._id, status: 'in_progress' });

    // Start the background scraping process without blocking the response
    (async () => {
      try {
        let leadsFound = 0;

        // TODO: Implement the actual scraping logic here
        // Steps:
        // 1. Initialize a scraper instance (e.g., Puppeteer, Cheerio, or a specialized library).
        // 2. Iterate through the specified 'sources' (websites, business directories, Google Maps).
        // 3. For each source, perform searches using 'keywords' and 'location'.
        // 4. Extract 'name', 'email', 'phone', 'sourceURL' from the scraped pages.
        // 5. Apply validation rules: 'unique phone/email', 'format check'.
        // 6. Before saving, check for 'duplicate removal' against existing Leads in MongoDB.
        // 7. Store valid, new leads into the `Lead` collection.
        // 8. Update the job status (success/failure) and `leadsProcessed` count in the `Job` collection.
        // 9. Implement error handling and logging for each step.
        // 10. Consider using a queue system (e.g., BullMQ, RabbitMQ) for long-running scraping tasks in production.
        
        appLogger.info(`Scraping job ${newJob._id} started with keywords: ${keywords}, sources: ${sources}`);

        // Simulate scraping delay and data extraction
        await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 2000));

        // Example of processing (replace with actual scraper output)
        if (Math.random() > 0.1) { // Simulate success 90% of the time
          for (let i = 0; i < Math.min(limit || 10, Math.floor(Math.random() * 20) + 1); i++) {
            const potentialLead = {
              name: `Test Business ${i + 1} ${keywords}`,
              email: `test${i + 1}_${Math.random().toString(36).substring(7)}@example.com`,
              phone: `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`,
              sourceURL: `https://example.com/source/${sources[0]}/page${i + 1}`,
              jobId: newJob._id,
            };

            // Basic validation and duplicate check
            const existingLead = await Lead.findOne({
              $or: [{ email: potentialLead.email }, { phone: potentialLead.phone }],
            });

            if (!existingLead) {
              await Lead.create(potentialLead);
              leadsFound++;
            } else {
              appLogger.info(`Skipped duplicate lead for job ${newJob._id}: ${potentialLead.email || potentialLead.phone}`);
            }
          }

          await Job.findByIdAndUpdate(newJob._id, { status: 'completed', leadsProcessed: leadsFound, completedAt: Date.now() });
          appLogger.info(`Scraping job ${newJob._id} completed. Found ${leadsFound} new leads.`);
          await Log.create({ level: 'info', module: 'Scraper', message: `Job ${newJob._id} completed. Found ${leadsFound} leads.`, metadata: { jobId: newJob._id, leadsFound } });

        } else { // Simulate failure
          throw new Error('Simulated scraper failure due to network issue.');
        }

      } catch (err) {
        await Job.findByIdAndUpdate(newJob._id, { status: 'failed', errorMessage: err.message, completedAt: Date.now() });
        appLogger.error(`Scraping job ${newJob._id} failed: ${err.message}`, { error: err.stack });
        await Log.create({ level: 'error', module: 'Scraper', message: `Job ${newJob._id} failed: ${err.message}`, metadata: { jobId: newJob._id, errorMessage: err.message } });
      }
    })();
  } catch (err) {
    appLogger.error(`Failed to start scraping job: ${err.message}`, { error: err });
    error(res, 500, 'Failed to start scraping job', err.message);
  }
};

// @desc    Get status of a specific scraping job
// @route   GET /api/scraper/status/:jobId
// @access  Public
exports.getScrapingJobStatus = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job || job.jobType !== 'scraper') {
      return error(res, 404, 'Scraping job not found');
    }
    success(res, 200, 'Scraping job status retrieved', job);
  } catch (err) {
    appLogger.error(`Failed to retrieve scraper job ${req.params.jobId} status: ${err.message}`, { error: err });
    // Handle CastError for invalid ObjectId
    if (err.name === 'CastError') {
      return error(res, 400, 'Invalid job ID format');
    }
    error(res, 500, 'Failed to retrieve job status');
  }
};

// @desc    List recent scraping jobs
// @route   GET /api/scraper/jobs
// @access  Public
exports.listScrapingJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ jobType: 'scraper' }).sort({ createdAt: -1 }).limit(20);
    success(res, 200, 'Recent scraping jobs retrieved', jobs);
  } catch (err) {
    appLogger.error(`Failed to retrieve recent scraper jobs: ${err.message}`, { error: err });
    error(res, 500, 'Failed to retrieve jobs');
  }
};