// schedule.js
import fs from 'fs';
import path from 'path';
import Bree from 'bree';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Create a require function for ES modules
const require = createRequire(import.meta.url);

// Get the current module's filename and directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the path to the jobs.json configuration file
const jobsFilePath = path.join(__dirname, 'jobs.json');

// Function to initialize and start the job scheduler
function startJobScheduler() {
  // Import the job configuration from jobs.json
  let jobs = require(jobsFilePath);

  // Initialize Bree with the current configuration.
  // The 'root' option points to the directory where job files are stored.
  let bree = new Bree({
    root: path.join(__dirname, 'jobs'),
    jobs
  });

  // Start the job scheduler
  bree.start();
  console.log('Job scheduler started!');

  // Watch for changes to the jobs.json file
  fs.watch(jobsFilePath, (eventType, filename) => {
    if (eventType === 'change') {
      console.log('jobs.json configuration has changed, restarting scheduler...');
      // Stop the currently running jobs
      bree.stop().then(() => {
        // Clear the require cache for the jobs.json file, so that the updated file is loaded
        delete require.cache[require.resolve(jobsFilePath)];
        // Reload the updated job configuration
        const newJobs = require(jobsFilePath);
        // Initialize a new Bree instance with the updated configuration
        bree = new Bree({
          root: path.join(__dirname, 'jobs'),
          jobs: newJobs
        });
        // Start the job scheduler with the new configuration
        bree.start();
        console.log('Job scheduler restarted with the updated configuration.');
      }).catch(err => {
        console.error('Error stopping the current jobs:', err);
      });
    }
  });
}

// Export the function so that it can be imported and used in another file (e.g., server.js)
export { startJobScheduler };
