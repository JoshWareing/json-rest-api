/**
 * @fileOverview
 * Implements a simple REST api in an object. Use is for workers/masters to 
 * receive tasks/results from masters/workers.
 */
'use strict';
var http = require('http');
var debug = require('debug')('sc:restapi');
var url = require('url');
var util = require('util');
var inspect = util.inspect;
var is = require('is2');
var asyncerr = require('async-err');

exports.RestApi = RestApi;

/**
 * RestApi constructor. Creates the HTTP server objects and starts listening on
 * the socket.
 * @param {Object} [config] An optional configuration object to configure the
 * RestApi.
 * @param {Function} [cb] An optional callback.
 * @constructor
 */
function RestApi(config, cb) {
  var self = this;
  self.routes = {};

  self.bindTo = (config && config.bindTo) ? config.bindTo : undefined;
  self.port = (config && config.port) ? config.port : 44401;

  // create teh http server object and on every request, try to match the
  // request with a known route. If there is no match, return a 404 error.
  self.HttpServer = http.createServer(function(req, res) {
    var uriPath = url.parse(req.url).pathname;

    // try to match the request & method with a handler
    for (var path in self.routes[req.method]) {
      if (path === uriPath) {
        self.routes[req.method][path](req, res);
        return;
      }
    }

    // no match was found, return a 404 error.
    debug('No path matched request for:', uriPath);
    res.writeHead(404, {'Content-Type': 'application/json; charset=utf-8'});
    res.end('{status:404, message:"Content not found."}', 'utf8');
  });

  self.HttpServer.listen(self.port, self.bindTo, function(err) {
    if (err & cb)  {
      var errStr = 'RestApi error: '+inspect(err);
      debug(errStr);
      return cb(new Error(errStr));
    }
    debug('REST API listening on port: '+self.port);
    if (cb)  cb();
  });
}

/**
 * Add a route along with a function to run.
 * @param {String} verb HTTP verb for route.
 * @param {String} path A valid URI path.
 * @param {Function} fun A function to tun when teh path executes.
 */
RestApi.prototype.addRoute = function(verb, path, func) {

  if (!is.nonEmptyStr(verb)) {
    return asyncerr(new Error('RestApi.prototype.addRoute bad verb: '+
                       inspect(verb)), cb);
  }

  if (!is.nonEmptyStr(path)) {
    return asyncerr(new Error('RestApi.prototype.addRoute bad path: '+
                              inspect(path)), cb);
  }

  if (!is.func(func)) {
    return asyncerr(new Error('RestApi.prototype.addRoute bad func: '+
                              inspect(func)), cb);
  }

  var httpVerb = verb.toUpperCase();
  debug('Adding: '+httpVerb+' '+path);
  if (!this.routes[httpVerb])  this.routes[httpVerb] = {};

  // Create a handling function for the route that gathers the 
  // the HTTP request body and passes that on.
  this.routes[httpVerb][path] = function(req, res) {
    var body = '';   // buffer for body.

    // collect the body in buf;
    req.on('data', function (data) { body += data.toString(); });

    // we have the body & header, no process.
    req.on('end', function () {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;

      var taskInfo;
      try {
        taskInfo = JSON.parse(body);
      } catch (err) {
        debug('Error parsing JSON body:',body);
        res.statusCode = 400;
        res.end('{"success": false, "msg": "Bad request."}', 'utf8');
        return;
      }
      func(req, res, taskInfo);
    });
  };
};
