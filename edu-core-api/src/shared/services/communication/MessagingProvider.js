import logger from '../logger.js';

/**
 * Abstract base class defining the messaging provider contract.
 */
export class MessagingProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Send a communication alert.
   * @param {Object} params
   * @param {string} params.to - Recipient destination (email address or phone number)
   * @param {string} [params.subject] - Optional subject/title of the message
   * @param {string} params.body - The main text body of the message
   * @param {string} [params.template] - Optional template name
   * @param {Object} [params.variables] - Optional key-value variables to compile templates
   */
  async send({ to, subject, body, template, variables }) {
    throw new Error(`Method "send" must be implemented on provider "${this.name}"`);
  }
}
