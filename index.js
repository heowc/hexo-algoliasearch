/* eslint-disable camelcase */
'use strict';
var path = require('path');

var initPosts = require('./lib/initPosts');
var Algolia = require('./lib/algolia');
var AlgoliaLocal = require('./lib/algoliaLocal');
var initPost = require('./lib/hooks/initPost');
var synchronizePosts = require('./lib/synchronizePosts');

var createdPosts = [];
var updatedPosts = [];
var deletedPosts = [];
// use this variable to not run portion of code if server is started to improve performance
var isServerStarted = false;
var algoliaLocal = AlgoliaLocal.getInstance();

// add a unique identifier in the front-matter of the post created
hexo.on('new', initPost);

// detect changes (creation, update, deletion) on posts
hexo.extend.processor.register(/_posts\/.*?\.md$/, function(file) {
  if (file.type !== 'skip') {
    algoliaLocal.addPost(file.source, file.type, false);
  }
});

hexo.on('generateBefore', function() {
  // save modifications into a file to sync this file later after deployment
  algoliaLocal.save();
  // register only one time this filter in case
  // the server is started to prevent multiple registrations
  if (!isServerStarted) {
    // register filter to collect data of each posts and synchronize them after deployment
    hexo.extend.filter.register('after_post_render', function(post) {
      // do not execute filter if server is running to improve performance
      if (isServerStarted) {
        return;
      }
      if (post.published) {
        // init post on the fly
        if (!post.algolia_object_id) {
          initPost(post);
        }

        if (algoliaLocal.getCreatedPosts().indexOf(post.full_source) > -1) {
          createdPosts.push(post);
        }
        else if (algoliaLocal.getUpdatedPosts().indexOf(post.full_source) > -1) {
          updatedPosts.push(post);
        }
      }

      return post;
    });
  }
});

// synchronize posts after deployment
hexo.on('deployAfter', synchronizePosts);

// define `isServerStarted` to `true` to prevent execution of
// portion of code to improve performance during writing posts
hexo.on('exit', function() {
  isServerStarted = true;
});

// register `hexo algolia` command
hexo.extend.console.register('algolia', 'Index your posts on Algolia', {
  options: [{
    name: '-i, --init', desc: 'Add a unique identifier on each post'
  }, {
    name: '-s, --sync', desc: 'Synchronize posts'
  }, {
    name: '-c, --clear', desc: 'Clear index on Algolia'
  }]
}, function(args, callback) {
  var postsDir = path.resolve(process.cwd(), this.config.source_dir, '_posts');

  if (args.i || args.init) {
    initPosts(postsDir);
  }

  if (args.c || args.clear) {
    var algolia = new Algolia(this.config.algolia);
    algoliaLocal.clear();
    algolia.clearIndex();
  }
});
/* eslint-enable camelcase */
