'use strict';

/**
 * Returns a promise that resolves if the user is logged in or rejects if
 * it's not.
 * @param  {Object} request
 * @return {Promise}
 */
this.loggedUserMiddleware = (request) => {
  return Promise.resolve().then(_ => {
    const userId = this._getUserId(request.event);

    if (!userId) {
      const error = new Error('Not logged in');
      error.statusCode = 403;
      error.errorType = 'NotLoggedException';
      throw error;
    }
    request.userId = userId;
  });
};

/**
 * Get user id from event context.
 * @param  {Object} event
 * @return {String?} userId
 */
this._getUserId = (event) => {
  try {
    return event.requestContext.identity.cognitoIdentityId;
  } catch(e) {
    return;
  }
};

module.exports = this.loggedUserMiddleware;
