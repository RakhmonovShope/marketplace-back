/**
 * generator/index.js
 *
 * Exports the generators so plop knows them
 */

const pluralize = require('handlebars-helper-pluralize');

const controllerGenerator = require('./templates/controller');

module.exports = (plop) => {
  plop.addHelper('pluralize', (text) => pluralize(2, text));

  plop.setGenerator('controller', controllerGenerator);
};
