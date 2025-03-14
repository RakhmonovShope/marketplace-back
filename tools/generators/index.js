const fs = require('fs');
const path = require('path');
const pluralize = require('handlebars-helper-pluralize');
const crudGenerator = require('./templates/crud');

module.exports = (plop) => {
  plop.addHelper('pluralize', (text) => {
    console.log('text', text);
    return pluralize(2, text);
  });

  const SCHEMA_PATH = path.join(__dirname, '../../prisma/schema.prisma');
  const MODELS_JSON_PATH = path.join(__dirname, '../../prisma/models.json');

  const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  const extractedModels = [...schemaContent.matchAll(/model (\w+)/g)].map(
    (match) => match[1],
  );

  let existingModels = [];
  if (fs.existsSync(MODELS_JSON_PATH)) {
    existingModels = JSON.parse(fs.readFileSync(MODELS_JSON_PATH, 'utf-8'));
  }

  const newModels = extractedModels.filter(
    (model) => !existingModels.includes(model),
  );

  if (newModels.length === 0) {
    console.log('✅ No new models found. Everything is up to date.');
    return;
  }

  console.log('🚀 New models detected:', newModels);

  const updatedModels = [...existingModels, ...newModels];
  fs.writeFileSync(MODELS_JSON_PATH, JSON.stringify(updatedModels, null, 2));

  const model = newModels[0];

  plop.setGenerator(model, crudGenerator(model));

  console.log('✅ Auto-generation complete!');
};
