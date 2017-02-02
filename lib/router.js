'use strict';

class Routes {

  constructor(routes, options) {
    this._routes = routes;
    this._errorMiddleware = routes['ERROR'] || Promise.resolve();
    this._options = Object.assign({}, {
      stage: process.env.STAGE,
      region: process.env.REGION,
    }, options);
    this._isProduction = this._options === 'production';
  }

  handler(event, context, done) {
    const requestObject = {
      event,
      context,
      stage: this._options.stage,
      region: this._options.region,
    };

    try {
      const middlewares = this._getMiddlewares(event.httpMethod, event.path);

      // Route not configured
      if (!middlewares || !middlewares.length) {
        const error = new Error(`${event.httpMethod} ${event.path} not found`);
        error.statusCode = 404;
        return this._errorHandler(requestObject, error, done);
      }

      this._runMiddlewares(middlewares, requestObject).then(response => {
        return this._responseHandler(requestObject, response, done);
      }).catch(error => {
        return this._errorHandler(requestObject, error, done);
      });
    } catch(error) {
      this._errorHandler(requestObject, error, done);
    }
  }

  /**
   * Runs middleware methods one after another. Middlwares are passed the
   * request object and only the last one should return the result that will
   * be the request response to the user.
   * @param  {Function<>} middlewares
   * @param  {Object} request
   * @return {Promise}
   */
  _runMiddlewares(middlewares, request) {
    var requestPromise = Promise.resolve();
    middlewares.forEach(middleware => {
      requestPromise = requestPromise.then(_ => middleware(request));
    });
    return requestPromise;
  }

  _getMiddlewares(httpMethod, path) {
    const pathParts = path.split('/').filter(x => !!x);
    const cleanPath = pathParts.join('/');
    const key = new RegExp(`${httpMethod.toUpperCase()} \/?${cleanPath}/?`);
    const routes = Object.keys(this._routes);
    const route = routes.find(route => route.match(key));
    return this._routes[route];
  }

  /**
   * Handles the last middleware response, which is the one that generates
   * the final response.
   * Notice that api gateway expects the request response to have a specific
   * format.
   * @param  {Object} request
   * @param  {Object} response - response object from the last middleware.
   * @return {Promise}
   */
  _responseHandler(request, response, done) {
    return Promise.resolve().then(_ => {
      let body = response;

      try {
        body = JSON.stringify(body);
      } catch (err) {
        console.log('ERROR stringifying response', {err, request, response});
      }

      done(null, {
        statusCode: 200,
        headers: {"Access-Control-Allow-Origin" : "*"},
        body: body,
      });
    });
  }

  _errorHandler(request, error, done) {
    return this._errorMiddleware(request, error).catch(errorMiddleware => {
      console.error('ERROR error middleware failed', errorMiddleware);
    }).then(_ => {
      const errorObj = typeof error === 'object' ? error : new Error();
      const statusCode = typeof errorObj.statusCode === 'number' &&
        errorObj.statusCode !== 200 ? errorObj.statusCode : 500;
      const response = {
        message: errorObj.message || 'Unknown error' ,
        type: errorObj.name || errorObj.code || 'UnknownErrorException',
      };

      return {
        statusCode: statusCode,
        headers: {"Access-Control-Allow-Origin" : "*"},
        body: JSON.stringify(response),
      };
    });
  }

}

module.exports = Routes;