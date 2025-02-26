const fs = require('fs');
const path = require('path');
const pluralize = require('handlebars-helper-pluralize');

module.exports = async (plop) => {
  plop.addHelper('pluralize', (text) => pluralize(2, text));

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

  // ✅ Step 1: Update models.json immediately to prevent re-execution
  const updatedModels = [...existingModels, ...newModels];
  fs.writeFileSync(MODELS_JSON_PATH, JSON.stringify(updatedModels, null, 2));

  const { default: nodePlop } = await import('node-plop');

  // ✅ Step 2: Register generators only once
  for (const model of newModels) {
    plop.setGenerator(`${model}-module`, {
      description: `Generate files for ${model}`,
      actions: [
        {
          type: 'add',
          path: `src/api/{{kebabCase model}}/{{kebabCase model}}.module.ts`,
          templateFile: './templates/controller/Controller.module.ts.hbs',
        },
        {
          type: 'add',
          path: `src/api/{{kebabCase model}}/{{kebabCase model}}.service.ts`,
          templateFile: './templates/controller/Controller.service.ts.hbs',
        },
        {
          type: 'add',
          path: `src/api/{{kebabCase model}}/{{kebabCase model}}.controller.ts`,
          templateFile: './templates/controller/Controller.controller.ts.hbs',
        },
        {
          type: 'add',
          path: `src/api/{{kebabCase model}}/{{kebabCase model}}.dto.ts`,
          templateFile: './templates/controller/Controller.dto.ts.hbs',
        },
        {
          type: 'add',
          path: `src/api/{{kebabCase model}}/index.ts`,
          templateFile: './templates/controller/index.ts.hbs',
        },
        // Auto-register the module in app.module.ts
        {
          type: 'append',
          path: 'src/app.module.ts',
          pattern: /imports: \[/,
          template: `    {{pascalCase model}}Module,`,
        },
        {
          type: 'append',
          path: 'src/app.module.ts',
          pattern: /from '@nestjs\/common';/,
          template: `import { {{pascalCase model}}Module } from './api/{{kebabCase model}}';`,
        },
      ],
    });
  }

  // ✅ Step 3: Execute generators only once
  const plopInstance = await nodePlop(__filename);
  for (const model of newModels) {
    console.log(`⚡ Running generator for: ${model}`);
    await plopInstance.getGenerator(`${model}-module`).runActions({});
  }

  console.log('✅ Auto-generation complete!');
};
