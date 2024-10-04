const fs = require('fs');
const path = require('path');

function componentExists(comp, type = 'controller') {
  try {
    const components = fs.readdirSync(
      path.join(__dirname, `../../../src/${type}`),
    );
    return components.indexOf(comp) >= 0;
  } catch (error) {
    console.error(`Error reading ${type} directory:`, error);
    return false; // Return false if an error occurs
  }
}

module.exports = componentExists;
