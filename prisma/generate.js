const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, 'schema.prisma');
const MODELS_JSON_PATH = path.join(__dirname, 'models.json');

// Read Prisma schema and extract models
const content = fs.readFileSync(SCHEMA_PATH, 'utf-8');
const models = [...content.matchAll(/model (\w+)/g)].map((match) => match[1]);

// Write models to JSON file
fs.writeFileSync(MODELS_JSON_PATH, JSON.stringify(models, null, 2));

console.log('✅ Models extracted:', models);
