var chalk = require('chalk');
var green = chalk.green;

var Algolia = require('./lib/algolia');
var processPost = require('./lib/processPost');

/**
 * Synchronize posts on Algolia
 * @returns {void}
 */
function synchronizePosts() {
  var config = hexo.config.algolia;
  var algolia = new Algolia(config);
  // process post before indexation
  var postsToIndex = createdPosts.concat(updatedPosts).map(function(post) {
    return processPost(post, config);
  });
  var postsToDelete = algoliaLocal.getPostsToDelete();
  
  // index new posts & edited posts
  algolia.saveObjects(postsToIndex, function(err) {
    if (err) {
      throw err;
    }
    // add new synchronized posts in local index
    algoliaLocal.addSyncedPosts(createdPosts);
    // clear created and updated posts
    algoliaLocal.clearUpdatedPosts();
    algoliaLocal.clearCreatedPosts();
    
    // remove deleted posts on Algolia
    algolia.deleteObjects(postsToDelete, function(err) {
      if (err) {
        throw err;
      }
      // remove deleted posts of the local index
      algoliaLocal.deleteSyncedPosts(algoliaLocal.getDeletedPosts());
      algoliaLocal.clearDeletedPosts();
      console.log(green('INFO  ') + 'Indexation done. Index is up-to-date.');
      // clear arrays
      createdPosts = [];
      updatedPosts = [];
      deletedPosts = [];
    });
  });
}

module.exports = synchronizePosts;
