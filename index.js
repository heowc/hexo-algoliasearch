'use strict';

var path = require('path');
var chalk = require('chalk');
var _ = require('lodash');
var green = chalk.green;

var initPosts = require('./lib/initPosts');
var processPost = require('./lib/processPost');
var Algolia = require('./lib/algolia');
var AlgoliaLocal = require('./lib/algoliaLocal');
var addAlgoliaObjectId = require('./lib/hooks/addAlgoliaObjectId');

var createdFilenames = [];
var editedFilenames = [];
var deletedFilenames = [];
var createdPosts = [];
var editedPosts = [];
var deletedPosts = [];

// Add a unique identifier in the front-matter of the post created
hexo.on('new', addAlgoliaObjectId);

hexo.extend.processor.register('_posts/', function(file) {
  if (file.type === 'create') {
    createdFilenames.push(file.source);
  }
  else if (file.type === 'update') {
    editedFilenames.push(file.source);
  }
  else if (file.type === 'delete') {
    /* eslint-disable camelcase */
    deletedFilenames.push({full_source: file.source});
    /* eslint-enable camelcase */
  }
});

hexo.on('generateBefore', function() {
  // register filter to collect data of each posts
  hexo.extend.filter.register('after_post_render', function(post) {
    if (post.published) {
      // init post on the fly - we add a unique identifier for Algolia
      if (!post.algolia_object_id) {
        addAlgoliaObjectId(post);
      }

      if (createdFilenames.indexOf(post.full_source) > -1) {
        createdPosts.push(post);
      }
      else if (editedFilenames.indexOf(post.full_source) > -1) {
        editedPosts.push(post);
      }
    }
    return post;
  });
});

hexo.on('deployAfter', function() {
  var config = this.config.algolia;
  var algolia = new Algolia(config);
  var algoliaLocal = new AlgoliaLocal(config);

  // Due to a bug from Hexo, filter created posts because when a post is added,
  // all posts are considered as `create`
  createdPosts = _.pullAllBy(createdPosts, algoliaLocal.posts, 'algolia_object_id');

  // process post before indexation
  var postsToIndex = createdPosts.concat(editedPosts).map(function(post) {
    return processPost(post, config);
  });

  // get `algolia_object_id` of deleted posts
  deletedPosts = _.intersectionBy(algoliaLocal.posts, deletedFilenames, 'full_source');
  deletedPosts = deletedPosts.map(function(post) {
    /* eslint-disable camelcase */
    return post.algolia_object_id;
    /* eslint-enable camelcase */
  });

  // index new posts & edited posts
  algolia.saveObjects(postsToIndex, function(err) {
    if (err) {
      throw err;
    }
    // add new posts to the local index
    algoliaLocal.addObjects(createdPosts);
    // remove deleted posts on Algolia
    algolia.deleteObjects(deletedPosts, function(err) {
      if (err) {
        throw err;
      }
      // remove deleted posts of the local index
      algoliaLocal.deleteObjects(deletedFilenames);
      console.log(green('INFO  ') + 'Indexation done. Index is up-to-date.');
    });
  });
});

// register `hexo algolia` command
hexo.extend.console.register('algolia', 'Index your posts on Algolia', {
  options: [{
    name: '-n, --no-clear', desc: 'Does not clear the existing index'
  }, {
    name: '-i, --init', desc: 'Add a unique identifier on each post'
  }]
}, function(args) {
  var hexo = this;
  var postsDir = path.resolve(process.cwd(), hexo.config.source_dir, '_posts');

  if (args.i || args.init) {
    initPosts(postsDir);
  }
});
