/**
 * Add `algolia_object_id` variable for each post to be ready to index
 * @param {String} postsDir Folder containing posts
 * @returns {void}
 */
function initPosts(postsDir) {
  var async = require('async');
  var chalk = require('chalk');
  var cuid = require('cuid');
  var fs = require('fs');
  var frontMatter = require('hexo-front-matter');
  var path = require('path');
  var rFilename = /\.md$/;
  var modifiedFilesCount = 0;
  var data = null;
  var file = null;
  
  console.log(chalk.magenta('Initializing posts...'));
  
  fs.readdir(postsDir, function(error, filenames) {
    if (error) {
      throw error;
    }
    
    // only keep posts
    filenames = filenames.filter(function(filename) {
      return rFilename.test(filename);
    });
    // resolve path for all filenames
    filenames = filenames.map(function(filename) {
      return path.resolve(postsDir, filename);
    });
    
    // add `algolia_object_id` variable in each posts
    async.forEach(filenames, function(filename, cb) {
      try {
        file = fs.readFileSync(filename, 'utf-8');
        data = frontMatter.parse(file);
        if (data.algolia_object_id) {
          cb();
        }
        else {
          /* eslint-disable camelcase */
          data.algolia_object_id = cuid();
          /* eslint-enable camelcase */
          fs.writeFileSync(filename, frontMatter.stringify(data));
          console.log(chalk.green('Initialized: ') + chalk.magenta(path.basename(filename)));
          modifiedFilesCount++;
          cb();
        }
      }
      catch (err) {
        console.log(chalk.red('Can\'t process ' + filename + ' file : ' + err));
      }
    }, function(err) {
      if (err) {
        throw err;
      }
      console.log(chalk.magenta('Initialization done. ' + modifiedFilesCount + ' posts modified.'));
    });
  });
}

module.exports = initPosts;
