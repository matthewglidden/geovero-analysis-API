// analysisHelper.js

/**
 * Generates improvement opportunities based on review text.
 * @param {Array} reviews - Array of review objects containing text content.
 * @returns {Array} - Array of opportunity strings based on common issues.
 */
function generateOpportunities(reviews) {
    const opportunities = [];
    
    reviews.forEach(review => {
      const text = review.text.toLowerCase();
      
      if (text.includes("cleanliness")) {
        opportunities.push("Improve cleanliness standards based on guest feedback.");
      }
      if (text.includes("service")) {
        opportunities.push("Enhance customer service quality.");
      }
      // Add more conditions as needed for other common issues
    });
    
    return [...new Set(opportunities)]; // Remove duplicates
  }
  
  /**
   * Summarizes reviews into a short description of common feedback.
   * @param {Array} reviews - Array of review objects containing text content.
   * @returns {String} - A summary of the most common review sentiments.
   */
  function summarizeReviews(reviews) {
    const summary = [];
  
    reviews.forEach(review => {
      const text = review.text.toLowerCase();
      
      if (text.includes("comfortable") || text.includes("spacious")) {
        summary.push("Guests frequently mention comfort and spaciousness.");
      }
      if (text.includes("noisy") || text.includes("noise")) {
        summary.push("Some guests have reported issues with noise.");
      }
      // Add more conditions to capture other themes
    });
    
    return [...new Set(summary)].join(" ");
  }
  
  // Export the helper functions
  module.exports = {
    generateOpportunities,
    summarizeReviews
  };
  