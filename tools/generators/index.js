const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const pluralize = require('handlebars-helper-pluralize');
const crudGenerator = require('./templates/crud');

module.exports = (plop) => {
  plop.addHelper('pluralize', (text) => pluralize(2, text));
  plop.addHelper('eq', (a, b) => a === b);

  const SCHEMA_PATH = path.join(__dirname, '../../prisma/schema.prisma');
  const MODELS_JSON_PATH = path.join(__dirname, '../../prisma/models.json');

  const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  const extractedModels = [
    ...schemaContent.matchAll(/model (\w+) {([\s\S]*?)}/g),
  ].map((match) => ({
    name: match[1],
    fields: extractFields(match[2]), // Extract fields from model body
  }));

  let existingModels = [];
  if (fs.existsSync(MODELS_JSON_PATH)) {
    existingModels = JSON.parse(fs.readFileSync(MODELS_JSON_PATH, 'utf-8'));
  }

  const missingModels = extractedModels.filter(
    (model) => !existingModels.some((m) => m.name === model.name),
  );

  if (missingModels.length === 0) {
    console.log('✅ No new models found. Everything is up to date.');
    return;
  }

  const lastAddedModel = missingModels[missingModels.length - 1]; // Only process the last missing model

  console.log(`🚀 New model detected: ${lastAddedModel.name}`);

  plop.setGenerator(
    lastAddedModel.name,
    crudGenerator(lastAddedModel.name, lastAddedModel.fields),
  );

  try {
    console.log('🚀 Running Prisma migration...');
    execSync('pnpm prisma migrate dev --name init', { stdio: 'inherit' });
    console.log('✅ Prisma migration applied successfully!');

    const updatedModels = [...existingModels, lastAddedModel.name];
    fs.writeFileSync(MODELS_JSON_PATH, JSON.stringify(updatedModels, null, 2));
    console.log('✅ Updated models.json with the new model.');
  } catch (error) {
    console.error('❌ Error applying Prisma migration:', error);
    process.exit(1);
  }

  // const updatedModels = [...existingModels, lastAddedModel.name];
  // fs.writeFileSync(MODELS_JSON_PATH, JSON.stringify(updatedModels, null, 2));
};

function extractFields(modelBody) {
  return [...modelBody.matchAll(/(\w+)\s+(\w+)/g)].map((match) => ({
    name: match[1],
    type: mapPrismaType(match[2]), // Convert Prisma types to TS types
    example: generateExample(match[2]), // Generate example values
  }));
}

// ✅ Helper Function: Convert Prisma Types to TypeScript Types
function mapPrismaType(prismaType) {
  const typeMap = {
    String: 'string',
    Boolean: 'boolean',
    Int: 'number',
    Float: 'number',
    DateTime: 'Date',
  };
  return typeMap[prismaType] || 'string';
}

// ✅ Helper Function: Generate Example Values
function generateExample(prismaType) {
  const examples = {
    String: 'Example Value',
    Boolean: true,
    Int: 123,
    Float: 12.34,
    DateTime: '2024-01-01T00:00:00.000Z',
  };
  return examples[prismaType] || 'Example';
}
