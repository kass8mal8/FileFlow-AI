class BaseAgent {
  constructor(name) {
    this.name = name;
  }

  /**
   * Main execution method
   * @param {string} input - The primary text or data to process
   * @param {object} context - Additional metadata (e.g., user info, filenames)
   */
  async execute(input, context = {}) {
    throw new Error(`${this.name} must implement execute()`);
  }

  /**
   * Log agent activity
   */
  log(message) {
    console.log(`[${this.name}] ${message}`);
  }
}

module.exports = BaseAgent;
