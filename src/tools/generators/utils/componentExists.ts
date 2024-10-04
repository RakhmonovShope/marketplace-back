/**
 * componentExists
 *
 * Check whether the given component exist in either the components or containers directory
 */

const fs = require('fs');
const path = require('path');

function componentExists(comp, type = 'controller') {
  const components = fs.readdirSync(
    path.join(__dirname, `../../../src/${type}`),
  );

  return components.indexOf(comp) >= 0;
}

module.exports = componentExists;
