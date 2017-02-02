'use strict';

const Joi = require('joi');

/**
 * Returns a middleware that validates the request against the schemas object
 * @param  {Object} schemas - Schema object where key is the field name in
 *   the event object (body, queryStringParameters, pathParameters, ..) and
 *   values are a Joi Schema instance.
 * @return {Promise}
 */
this.requestValidation = (schemas) => {
  return (request) => {
    return this._validateRequest(request.event, schemas).then(validParams => {
      request.params = validParams;
    });
  };
};

/**
 * Validate every Joi schema against the 'event' object, where 'schemas' is an
 * object with keys which are the attribute names in event.
 * @param  {Object} event Lambda event.
 * @param  {Object.<>} schemas Joi event.
 * @return {Object} Validated parameters.
 */
this._validateRequest = (event, schemas) => {
  return Promise.all(Object.keys(schemas).map(fieldName => {
    const schema = schemas[fieldName];

    if (schema.isJoi) {
      const params = this._getParametersFromRequest(event, fieldName);

      return this._validateSchema(params, schema).then(data => {
        // If data is not an object, assign same key
        if (data && data.constructor.name !== 'Object') {
          const res = {};
          res[fieldName] = data;
          return res;
        }
        return data;
      });
    }
    return {};
  })).then(data => {
    // flattens and merges into an object
    return Object.assign.apply(Object, [{}].concat(data));
  });
};

/**
 * Returns parameters from the event object.
 * @param  {Object} event
 * @param  {String} field
 * @return {Object}
 */
this._getParametersFromRequest = (event, field) => {
  const data = event[field];

  if (data && typeof data !== 'object'){
    return JSON.parse(data);
  }
  return data;
};

/**
 * Validate schema with parameters.
 * @param  {Object} params
 * @param  {Object} schema - Joi schema
 * @return {Promise} Resolves to an array of objects with paramName-paramValue
 *   already validated, or rejects if fails with the error description
 */
this._validateSchema = (params, schema) => {
  return new Promise((resolve, reject) => {
    try {
      Joi.validate(params || {}, schema, (err, value) => {
        if (err) {
          const firstMessage = ((err.details || [])[0] || {}).message;
          const error = new Error(firstMessage || err.details);
          error.errorType = 'InvalidParametersException';
          error.statusCode = 400;
          reject(err);
        } else {
          resolve(value);
        }
      });
    } catch(err) {
      err.statusCode = 500;
      reject(err);
    }
  });
};

module.exports = this.requestValidation;
