var algoliasearch = require('algoliasearch');
var async = require('async');
var _ = require('lodash');
var chalk = require('chalk');
var green = chalk.green;
var red = chalk.red;

/**
 * Algolia client wrapper
 * @param {Object} config
 * @constructor
 */
var Algolia = function(config) {
  this.config = _.assign({chunkSize: 5000}, config);
  this.client = algoliasearch(config.appId, config.adminApiKey);
  this.index = this.client.initIndex(config.indexName);
};

Algolia.prototype = {
  /**
   * Save objects in an Algolia index
   * @param {Array} objects
   * @param {Function} callback
   * @returns {void}
   */
  saveObjects: function(objects, callback) {
    if (!objects.length) {
      console.log(green('INFO  ') + 'No posts to index on Algolia');
      callback(undefined);
      return;
    }

    // split our results into chunks of 5,000 objects,
    // to get a good indexing/insert performance
    var chunk = _.chunk(objects, this.config.chunkSize);

    console.log(green('INFO  ') + 'Indexing posts on Algolia...');

    async.each(chunk, this.index.saveObjects.bind(this.index), function(err) {
      if (err) {
        console.log(red('ERROR  ') + 'Error has occurred during indexing posts - ' + err);
        throw err;
      }

      console.log(green('INFO  ') + objects.length + ' posts indexed on Algolia index');

      if (typeof callback === 'function') {
        callback(err);
      }
    });
  },
  /**
   * Delete objects in an Algolia index
   * @param {Array} objectIds
   * @param {Function} callback
   * @returns {void}
   */
  deleteObjects: function(objectIds, callback) {
    if (!objectIds.length) {
      console.log(green('INFO  ') + 'No posts to delete on Algolia');
      callback(undefined);
      return;
    }

    console.log(green('INFO  ') + 'Deleting posts on Algolia...');

    this.index.deleteObjects(objectIds, function(err) {
      if (err) {
        console.log(red('ERROR  ') + 'Error has occurred during deleting posts - ' + err);
        throw err;
      }

      console.log(green('INFO  ') + objectIds.length + ' posts removed from Algolia index');

      if (typeof callback === 'function') {
        callback(err);
      }
    });
  },
  clearIndex: function(callback) {
    this.index.clearIndex(function(err) {
      if (err) {
        console.log(red('ERROR  ') + 'Error has occurred during deleting posts - ' + err);
        throw err;
      }
      console.log(green('INFO  ') + 'Algolia index cleared');
      
      if (typeof callback === 'function') {
        callback(err);
      }
    });
  }
};

module.exports = Algolia;
