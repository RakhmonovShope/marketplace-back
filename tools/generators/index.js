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

  // ✅ Step 1: Update models.json immediately to prevent re-execution
  const updatedModels = [...existingModels, ...newModels];
  fs.writeFileSync(MODELS_JSON_PATH, JSON.stringify(updatedModels, null, 2));

  const model = newModels[0];

  // ✅ Step 2: Register generators in the SAME Plop instance

  const crud = {
    description: `Generate a new module for ${model}`,
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Enter the model name',
        default: model,
      },
    ],
    actions: [
      {
        type: 'add',
        path: '../../src/api/{{kebabCase name}}/{{kebabCase name}}.module.ts',
        templateFile: './templates/controller/Controller.module.ts.hbs',
      },
      {
        type: 'add',
        path: '../../src/api/{{kebabCase name}}/{{kebabCase name}}.service.ts',
        templateFile: './templates/controller/Controller.service.ts.hbs',
      },
      {
        type: 'add',
        path: '../../src/api/{{kebabCase name}}/{{kebabCase name}}.controller.ts',
        templateFile: './templates/controller/Controller.controller.ts.hbs',
      },
      {
        type: 'add',
        path: '../../src/api/{{kebabCase name}}/{{kebabCase name}}.dto.ts',
        templateFile: './templates/controller/Controller.dto.ts.hbs',
      },
      {
        type: 'add',
        path: '../../src/api/{{kebabCase name}}/index.ts',
        templateFile: './templates/controller/index.ts.hbs',
      },
      {
        type: 'append',
        path: '../../src/app.module.ts',
        pattern: /imports: \[/,
        template: `    {{pascalCase name}}Module,`,
      },
      {
        type: 'append',
        path: '../../src/app.module.ts',
        pattern: /from '@nestjs\/common';/,
        template: `import { {{pascalCase name}}Module } from './api/{{kebabCase name}}';`,
      },
      {
        type: 'append',
        path: '../../src/api/auth/auth.enum.ts',
        pattern: /PERMISSIONS\s*{/,
        template: `  //{{upperCase name}}  
        {{upperCase name}}__CREATE = '{{upperCase name}}__CREATE',
        {{upperCase name}}__VIEW = '{{upperCase name}}__VIEW',
        {{upperCase name}}__UPDATE = '{{upperCase name}}__UPDATE',
        {{upperCase name}}__DELETE = '{{upperCase name}}__DELETE',`,
      },
    ],
  };

  plop.setGenerator(model, crud);

  // ✅ Step 3: Execute generators inside the SAME plop instance
  // for (const model of newModels) {
  //   console.log(`⚡ Running generator for: ${model}`);
  //   await plop.getGenerator(`${model}-module`);
  // }

  console.log('✅ Auto-generation complete!');
};
