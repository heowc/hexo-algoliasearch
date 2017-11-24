'use strict';

var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var chalk = require('chalk');
var green = chalk.green;
var red = chalk.red;
var DEFAULT_FILE_DATA = JSON.stringify({
  createdPosts: [],
  updatedPosts: [],
  deletedPosts: [],
  syncedPosts: []
});

/**
 * Local "Algolia index"
 * We store all posts (objectID and path) indexed on Algolia.
 * We use it to detect which posts is deleted and then delete it on Algolia.
 * @constructor
 */
/* eslint-disable camelcase */
var AlgoliaLocal = (function() {
  var filename = 'algolia-local.json';
  var filepath = path.resolve(process.cwd(), filename);
  var instance = null;
  var data = null;

  /**
   * Create and init local "Algolia index"
   * @returns {void}
   */
  function init() {
    // check if file containing synced posts exist
    try {
      fs.statSync(filepath);
    }
    catch (err) {
      // create file if it doesn't exist
      if (err.code === 'ENOENT') {
        fs.writeFileSync(filepath, DEFAULT_FILE_DATA);
        console.log(green('INFO  ') + 'Local Algolia index initialized');
      }
      else {
        console.log(red('ERROR  ') + 'Can\'t read local Algolia index - ' + err);
      }
    }

    // load synced posts
    try {
      data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    }
    catch (err) {
      console.log(red('ERROR  ') + 'Can\'t read local Algolia index - ' + err);
    }

    return {
      addPost: addPost,
      addPosts: addPosts,
      deletePosts: deletePosts,
      addSyncedPosts: addSyncedPosts,
      deleteSyncedPosts: deleteSyncedPosts,
      getStatus: getStatus,
      getCreatedPosts: getCreatedPosts,
      getUpdatedPosts: getUpdatedPosts,
      getDeletedPosts: getDeletedPosts,
      getSyncedPosts: getSyncedPosts,
      getUnsyncedPosts: getUnsyncedPosts,
      getPostsToDelete: getPostsToDelete,
      clear: clear,
      clearCreatedPosts: clearCreatedPosts,
      clearUpdatedPosts: clearUpdatedPosts,
      clearDeletedPosts: clearDeletedPosts,
      clearSyncedPosts: clearSyncedPosts,
      save: save
    };
  }

  /**
   * Get unsynchronized created posts
   * @returns {Array}
   */
  function getCreatedPosts() {
    return data.createdPosts;
  }

  /**
   * Get unsynchronized updated posts
   * @returns {Array}
   */
  function getUpdatedPosts() {
    return data.updatedPosts;
  }

  /**
   * Get unsynchronized deleted posts
   * @returns {Array}
   */
  function getDeletedPosts() {
    return data.deletedPosts;
  }

  /**
   * Get posts that need to be deleted on Algolia
   * @returns {Array} a list of objectID
   */
  function getPostsToDelete() {
    // search posts that need to be deleted
    var postsToDelete = _.intersectionWith(getSyncedPosts(), getDeletedPosts(),
      function(arr1, arr2) {
        return arr1.full_source === arr2;
      }
    );
    // get only object ID
    postsToDelete = postsToDelete.map(function(post) {
      return post.algolia_object_id;
    });
    return postsToDelete;
  }

  /**
   * Get synchronized posts
   * @returns {Array}
   */
  function getSyncedPosts() {
    return data.syncedPosts;
  }

  /**
   * Get unsynchronized posts
   * @returns {Array}
   */
  function getUnsyncedPosts() {
    return getCreatedPosts().concat(getUpdatedPosts(), getDeletedPosts());
  }

  /**
   * Clear created posts
   * @returns {void}
   */
  function clearCreatedPosts() {
    data.createdPosts = [];
    save();
  }

  /**
   * Clear update posts
   * @returns {void}
   */
  function clearUpdatedPosts() {
    data.updatedPosts = [];
    save();
  }

  /**
   * Clear synchronized posts
   * @returns {void}
   */
  function clearSyncedPosts() {
    data.syncedPosts = [];
    save();
  }

  /**
   * Clear all index
   * @returns {void}
   */
  function clear() {
    data.createdPosts = [];
    data.updatedPosts = [];
    data.deletedPosts = [];
    data.syncedPosts = [];
    save();
  }

  /**
   * Clear deleted posts
   * @returns {void}
   */
  function clearDeletedPosts() {
    data.deletedPosts = [];
    save();
  }

  /**
   * Get status of the synchronization
   * @returns {void}
   */
  function getStatus() {
    var count = data.createdPosts.length + data.updatedPosts.length + data.deletedPosts.length;
    console.log(green('INFO  ') + count + ' posts unsynchronized, ' + data.syncedPosts.length +
      ' posts synchronized on Algolia');
  }

  /**
   * Add post in local "Algolia index"
   * @param {String} filename A filename of a post
   * @param {String} type Type of post
   * @param {Boolean} saveNow save modifications in a file
   * @returns {void}
   */
  function addPost(filename, type, saveNow) {
    var index = resolveType(type);
    var postsToSync = null;
    var postSynced = null;

    if (typeof saveNow !== 'boolean') {
      saveNow = true;
    }

    if (type === 'create') {
      // Due to a bug from Hexo, filter created posts because when a post is added,
      // all posts are considered as `create`
      postSynced = data.syncedPosts.map(function(post) {
        return post.full_source;
      });
      postsToSync = data.createdPosts.concat(data.updatedPosts, postSynced);
    }
    else if (type === 'update') {
      postsToSync = data.createdPosts.concat(data.updatedPosts);
    }
    else {
      postsToSync = data[index];
    }
    // check if post is already registered
    if (postsToSync.indexOf(filename) > -1) {
      return;
    }

    data[index].push(filename);
    // write modifications in file directly
    if (saveNow) {
      save();
    }
  }
  
  /**
   * Add posts in local "Algolia index"
   * @param {Array} posts a list of Hexo posts
   * @param {String} type Type of posts
   * @param {Boolean} saveNow save modifications in a file
   * @returns {void}
   */
  function addPosts(posts, type, saveNow) {
    var index = resolveType(type);
    var postsTosync = null;
    var postSynced = null;

    if (typeof saveNow !== 'boolean') {
      saveNow = true;
    }

    if (type === 'create') {
      // Due to a bug from Hexo, filter created posts because when a post is added,
      // all posts are considered as `create`
      postSynced = data.syncedPosts.map(function(post) {
        return post.full_source;
      });
      postsTosync = data.createdPosts.concat(data.updatedPosts, postSynced);
    }
    else if (type === 'update') {
      postsTosync = data.createdPosts.concat(data.updatedPosts);
    }
    else {
      postsTosync = data[index];
    }

    posts = _.pullAll(posts, postsTosync);

    if (!posts.length) {
      return;
    }

    data[index] = data[index].concat(posts);

    // write modifications in file directly
    if (saveNow) {
      save();
    }
  }

  /**
   * Delete posts from local "Algolia index"
   * @param {Array} posts a list of Hexo posts
   * @param {String} type Type of posts
   * @returns {void}
   */
  function deletePosts(posts, type) {
    if (!posts.length) {
      return;
    }

    var index = resolveType(type);

    data[index] = _.pullAll(data[index], posts);
    save();
  }

  /**
   * Add posts in local "Algolia index"
   * @param {Array} posts a list of Hexo posts
   * @returns {void}
   */
  function addSyncedPosts(posts) {
    posts = _.pullAllBy(posts, data.syncedPosts, 'full_source');
    // check again if there is still some posts
    if (!posts.length) {
      return;
    }

    posts = posts.map(function(post) {
      return _.pick(post, ['algolia_object_id', 'full_source']);
    });

    data.syncedPosts = data.syncedPosts.concat(posts);
    save();
  }

  /**
   * Delete posts from local "Algolia index"
   * @param {Array} posts a list of Hexo posts
   * @returns {void}
   */
  function deleteSyncedPosts(posts) {
    data.syncedPosts = _.pullAllWith(data.syncedPosts, posts, function(arr1, arr2) {
      return arr1.full_source === arr2;
    });
    save();
  }

  /**
   * Write synced posts in a file
   * @returns {void}
   * @private
   */
  function save() {
    try {
      fs.writeFileSync(filename, JSON.stringify(data));
    }
    catch (err) {
      console.log(red('ERROR  ') + 'Can\'t save modifications in local Algolia index - ' + err);
    }
  }

  return {
    /**
     * Get singleton instance
     * @returns {Object} instance
     */
    getInstance: function() {
      if (!instance) {
        instance = init();
      }

      return instance;
    }
  };
})();
/* eslint-enable camelcase */

/**
 * Return correct object property
 * @param {String} type
 * @returns {String} object property where posts must be added or removed
 */
function resolveType(type) {
  switch (type) {
    case 'create':
      return 'createdPosts';
    case 'update':
      return 'updatedPosts';
    case 'delete':
      return 'deletedPosts';
    case 'sync':
      return 'syncedPosts';
    default:
      return 'updatedPosts';
  }
}

module.exports = AlgoliaLocal;

