module.exports = (defaultName, fields) => ({
  description: `Generate a new module for ${defaultName}`,
  prompts: [
    {
      type: 'input',
      name: 'name',
      message: 'Enter the model name',
      default: defaultName,
    },
  ],
  actions: [
    {
      type: 'add',
      path: '../../src/api/{{kebabCase name}}/{{kebabCase name}}.module.ts',
      templateFile: './templates/crud/Controller.module.ts.hbs',
    },
    {
      type: 'add',
      path: '../../src/api/{{kebabCase name}}/{{kebabCase name}}.service.ts',
      templateFile: './templates/crud/Controller.service.ts.hbs',
    },
    {
      type: 'add',
      path: '../../src/api/{{kebabCase name}}/{{kebabCase name}}.controller.ts',
      templateFile: './templates/crud/Controller.controller.ts.hbs',
    },
    {
      type: 'add',
      path: '../../src/api/{{kebabCase name}}/{{kebabCase name}}.dto.ts',
      templateFile: './templates/crud/Controller.dto.ts.hbs',
      data: { fields }, // Pass extracted fields to the template
    },
    {
      type: 'add',
      path: '../../src/api/{{kebabCase name}}/index.ts',
      templateFile: './templates/crud/index.ts.hbs',
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
});
