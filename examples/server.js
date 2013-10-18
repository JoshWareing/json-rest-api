'use strict';
var JsonRestApi = require('../index').RestApi;
var inspect = require('util').inspect;
var debug = require('debug')('json-rest-api:example:server');

var RestApi = new JsonRestApi({port: 8000}, function(err) {
  if (err) {
    debug('/ping error: '+inspect(err));
    return;
  }
  console.log('Listening on port 8000.');

  // add a route
  RestApi.addRoute('get', '/ping', function(req, res) {
    res.json({success: true, pong: 'pong'});
  });
});
