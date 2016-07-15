'use strict';

var path = require('path');
var initPosts = require('./lib/initPosts');
var addAlgoliaObjectId = require('./lib/hooks/addAlgoliaObjectId');

// it add an `algoliaOjbectId` variable in the front-matter of the post created
hexo.on('new', addAlgoliaObjectId);

// register `hexo algolia` command
hexo.extend.console.register('algolia', 'Index your posts on Algolia', {
  options: [{
    name: '-n, --no-clear', desc: 'Does not clear the existing index'
  }, {
    name: '-i, --init', desc: 'Add `algolia_object_id` variable for each post to be ready to index'
  }]
}, function(args) {
  var hexo = this;
  var postsDir = path.resolve(process.cwd(), hexo.config.source_dir, '_posts');

  if (args.i || args.init) {
    initPosts(postsDir);
  }
});
