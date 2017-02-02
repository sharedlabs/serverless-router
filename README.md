# serverless-router

Routing for serverless apps with services or monolithic patterns.

It uses Joi for validation.


## The router

The Router class has to be instanciated passing an object with routes and middlewares:

```
new Router({

  `${httpMethod} ${path}`: [middleware, middleware, ..]

  `ERROR`: optionalErrorMiddleware

})
```

## The middlewares

Similar to express, your middlewares should look like this:


```
mymiddleware(req) {
  /**
   * validated parameters object
   * @type {Object}
   */
  const params = req.params;

  /**
   * userId. If the user if logged using Cognito
   * @type {String}
   */
  const userId = req.userId;

  /**
   * AWS Event object
   * @type {Object}
   */
  const event = req.event;

  /**
   * AWS Context object
   * @type {Object}
   */
  const context = req.context;

  // Must always return a promise
  return Promise.resolve({foo: 'bar'});
}
```

## The validation

Validation is left to Joi. [https://github.com/hapijs/joi]
But you could implement any validation you wish as a middleware.

For Joi, use the `validate` method, which will return a middleware that will
validate the passed schemas. Each key in the object you pass should be the
parameters object name you want to validate

  ```
  'GET auth/google-auth': [
      validate({
        queryStringParameters: joiSchemaForQueryStringParameters
      }),
      authController.googleAuth
  ],
  ```


## An Example

```router.js
'use strict';

const Joi = require('joi');
const serverlessRouter = require('serverless-router');
const validate = serverlessRouter.validate;
const userIsLogged = serverlessRouter.userIsLogged;
const Router = serverlessRouter.Router;

// Your controllers
const authController = require('./auth-controller');
const userController = require('./user-controller');
const commentsController = require('./user-controller');

const router = new Router({

  'GET auth/google-auth': [
      validate({
        queryStringParameters: Joi.object().keys({
          token: Joi.string().required(),
        }),
      }),
      authController.googleAuth
  ],

  'GET auth/google-refresh': [
      userIsLogged,
      validate({
        queryStringParameters: Joi.object().keys({
          token: Joi.string().required(),
        }),
      }),
      authController.googleRefresh
  ],

  'DELETE user': [
      validate({
        pathParameters: Joi.object().keys({
          userId: Joi.string().required(),
        }),
      }),
      userController.removeUser
  ],

  'POST comment': [
      validate({
        body: Joi.object().keys({
          comment: Joi.string().min(24).required(),
        }),
      }),
      commentsController.postComment
  ],

  'ERROR': (request) => {
    // handle error before responding to the user
  }

});

module.exports.router = router;
```


```authController.js
'use strict';

const Users = require('./users-model');

class UsersController {

  googleAuth(req) {
    const token = req.params.token;
    return new Users().googleAuth(token);
  }

  googleRefresh(req) {
    const userId = req.userId;
    const token = req.params.token;
    return new Users({userId}).googleRefresh(token);
  }

}

module.exports = new UsersController();

```