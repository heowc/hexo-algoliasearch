/**
 * Process a Hexo post before indexation on Algolia, select only desired fields
 * @param {Object} post A Hexo post
 * @param {Object} config Algolia config
 * @returns {Object} A Hexo post
 */
function processPost(post, config) {
  var _ = require('lodash');
  var actions = require('./actions');
  var fields = getFields(config.fields);
  var customFields = getCustomFields(config.fields);

  var key = null;
  var tags = [];
  var categories = [];
  var object = {};
  // index only published posts
  object = _.pick(post, fields);
  
  // define objectID for Algolia
  object.objectID = post._id;
  
  // extract tags
  if (fields.indexOf('tags') >= 0) {
    for (key in post.tags.data) {
      if (post.tags.data.hasOwnProperty(key)) {
        if (post.tags.data[key].hasOwnProperty('name')) {
          tags.push(post.tags.data[key].name);
        }
      }
    }
    object.tags = tags;
  }
  
  // extract categories
  if (fields.indexOf('categories') >= 0) {
    for (key in post.categories.data) {
      if (post.categories.data.hasOwnProperty(key)) {
        if (post.categories.data[key].hasOwnProperty('name')) {
          categories.push(post.categories.data[key].name);
        }
      }
    }
    object.categories = categories;
  }
  
  // handle custom fields
  for (key in customFields) {
    if (customFields.hasOwnProperty(key)) {
      var field = customFields[key].split(':');
      var fieldName = field[0];
      var actionName = field[1];
      var actionFn = actions[actionName];
      // execute action function on post field
      // and store result in post object
      object[fieldName + _.upperFirst(actionName)] = actionFn(post[fieldName]);
    }
  }
  return object;
}

/**
 * Get normal fields of a list of fields
 * @param {Array} fields A field name of a post
 * @returns {Array}
 */
function getFields(fields) {
  return fields.filter(function(field) {
    return !/:/.test(field);
  });
}

/**
 * Get fields name of a list of fields name that need a action on their value
 * @param {Array} fields A field name of a post
 * @returns {Array}
 */
function getCustomFields(fields) {
  return fields.filter(function(field) {
    return /:/.test(field);
  });
}

module.exports = processPost;
