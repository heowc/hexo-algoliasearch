'use strict';

/**
 * Add `algolia_object_id` variable in front-matter of post created
 * @param {Object} post an Hexo post
 * @returns {void}
 */
function addAlgoliaObjectId(post) {
  var cuid = require('cuid');
  var chalk = require('chalk');
  var green = chalk.green;
  var magenta = chalk.magenta;
  var red = chalk.red;
  var fs = require('fs');
  var frontMatter = require('hexo-front-matter');
  var id = cuid();
  /* eslint-disable camelcase */
  var filepath = post.full_source || post.path;
  /* eslint-enable camelcase */
  var file = fs.readFileSync(filepath, 'utf-8');
  var data = frontMatter.parse(file);
  
  /* eslint-disable camelcase */
  data.algolia_object_id = id;
  post.algolia_object_id = id;
  /* eslint-enable camelcase */
  
  try {
    fs.writeFileSync(filepath, frontMatter.stringify(data), 'utf-8');
    console.log(green('INFO  ') + 'Initialized: ' + magenta(post.path));
    return post;
  }
  catch (err) {
    console.log(red('ERROR  ') + 'Can\'t initialize ' + post.path + ' - ' + err);
  }
}

module.exports = addAlgoliaObjectId;
