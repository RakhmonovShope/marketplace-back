const fs = require('fs');
const path = require('path');
const pluralize = require('handlebars-helper-pluralize');
// const componentExists = require('../../utils/componentExists');

module.exports = (plop) => {
  plop.addHelper('pluralize', (text) => pluralize(2, text));

  // Read extracted models from models.json (generated from prisma schema)
  const MODELS_JSON_PATH = path.join(__dirname, '../../prisma/models.json');
  const models = JSON.parse(fs.readFileSync(MODELS_JSON_PATH, 'utf-8'));

  models.forEach((model) => {
    plop.setGenerator(`${model}-module`, {
      description: `Generate module for ${model}`,
      actions: [
        // Create Module
        {
          type: 'add',
          path: '../../src/api/{{kebabCase model}}/{{kebabCase model}}.module.ts',
          templateFile: './templates/controller/Controller.module.ts.hbs',
        },
        // Create Service
        {
          type: 'add',
          path: '../../src/api/{{kebabCase model}}/{{kebabCase model}}.service.ts',
          templateFile: './templates/controller/Controller.service.ts.hbs',
        },
        // Create Controller
        {
          type: 'add',
          path: '../../src/api/{{kebabCase model}}/{{kebabCase model}}.controller.ts',
          templateFile: './templates/controller/Controller.controller.ts.hbs',
        },
        // Create DTO
        {
          type: 'add',
          path: '../../src/api/{{kebabCase model}}/{{kebabCase model}}.dto.ts',
          templateFile: './templates/controller/Controller.dto.ts.hbs',
        },
        // Create index.ts
        {
          type: 'add',
          path: '../../src/api/{{kebabCase model}}/index.ts',
          templateFile: './templates/controller/index.ts.hbs',
        },
        // Auto-register Module in app.module.ts
        {
          type: 'append',
          path: '../../src/app.module.ts',
          pattern: /imports: \[/,
          template: `    {{pascalCase model}}Module,`,
        },
        {
          type: 'append',
          path: '../../src/app.module.ts',
          pattern: /from '@nestjs\/common';/,
          template: `import { {{pascalCase model}}Module } from './api/{{kebabCase model}}';`,
        },
        // Auto-add permissions for new modules
        {
          type: 'append',
          path: '../../src/api/auth/auth.enum.ts',
          pattern: /PERMISSIONS\s*{/,
          template: `  //{{upperCase model}}  
        {{upperCase model}}__CREATE = '{{upperCase model}}__CREATE',
        {{upperCase model}}__VIEW = '{{upperCase model}}__VIEW',
        {{upperCase model}}__UPDATE = '{{upperCase model}}__UPDATE',
        {{upperCase model}}__DELETE = '{{upperCase model}}__DELETE',`,
        },
      ],
    });
  });

  console.log(
    '🚀 Modules, Controllers, Services, DTOs, and Permissions are ready!',
  );
};
