'use strict';

/**
 * Add `algolia_object_id` variable in front-matter of post created
 * @param {Object} post An hexo post
 * @returns {void}
 */
function addAlgoliaObjectId(post) {
  var cuid = require('cuid');
  var fs = require('fs');
  var frontMatter = require('hexo-front-matter');
  var file = fs.readFileSync(post.path, 'utf-8');
  var data = frontMatter.parse(file);
  
  /* eslint-disable camelcase */
  data.algolia_object_id = cuid();
  /* eslint-enable camelcase */
  fs.writeFileSync(post.path, frontMatter.stringify(data), 'utf-8');
}

module.exports = addAlgoliaObjectId;
