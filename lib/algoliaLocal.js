'use strict';

var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var chalk = require('chalk');
var green = chalk.green;
var red = chalk.red;

/**
 * Local "Algolia index"
 * We store all posts (objectID and path) indexed on Algolia.
 * We use it to detect which posts is deleted and then delete it on Algolia.
 * @constructor
 */
var AlgoliaLocal = function() {
  this.filename = 'algolia-local.json';
  this.filepath = path.resolve(process.cwd(), this.filename);
  this.posts = null;
  this.init();
};

AlgoliaLocal.prototype = {
  /**
   * Create and init local "Algolia index"
   * @returns {void}
   */
  init: function() {
    // check if file containing synced posts exist
    try {
      fs.statSync(this.filepath);
    }
    catch (err) {
      // create file if it doesn't exist
      if (err.code === 'ENOENT') {
        fs.writeFileSync(this.filepath, '[]');
        console.log(green('INFO  ') + 'Local Algolia index initialized');
      }
      else {
        console.log(red('ERROR  ') + 'Can\'t read local Algolia index - ' + err);
      }
    }

    // load synced posts
    try {
      this.posts = JSON.parse(fs.readFileSync(this.filepath, 'utf-8'));
    }
    catch (err) {
      console.log(red('ERROR  ') + 'Can\'t read local Algolia index - ' + err);
    }
  },

  /**
   * Add objects in local "Algolia index"
   * @param {Array} objects a list of Hexo posts
   * @returns {void}
   */
  addObjects: function(objects) {
    if (!objects.length) {
      console.log(green('INFO  ') + 'No posts to index on local Algolia index');
      return;
    }

    objects = objects.map(function(object) {
      return _.pick(object, ['algolia_object_id', 'full_source']);
    });
    this.posts = this.posts.concat(objects);
    this._save();
    console.log(green('INFO  ') + objects.length + ' posts added to the local Algolia index');
  },

  /**
   * Delete objects from local "Algolia index"
   * @param {Array} objects a list of Hexo posts
   * @returns {void}
   */
  deleteObjects: function(objects) {
    if (!objects.length) {
      console.log(green('INFO  ') + 'No posts to delete from local Algolia index');
      return;
    }

    this.posts = _.pullAllBy(this.posts, objects, 'full_source');
    this._save();
    console.log(green('INFO  ') + objects.length + ' posts deleted from the local Algolia index');
  },

  /**
   * Write synced posts in a file
   * @returns {void}
   * @private
   */
  _save: function() {
    try {
      fs.writeFileSync(this.filename, JSON.stringify(this.posts));
    }
    catch (err) {
      console.log(red('ERROR  ') + 'Can\'t write in local Algolia index - ' + err);
    }
  }
};

module.exports = AlgoliaLocal;
