module.exports = function (plop) {
  plop.setGenerator('module', {
    description: 'Generate a new module',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Module name (e.g., Banner)',
        validate: (value) => {
          if (/.+/.test(value)) {
            return componentExists(value, 'controller')
              ? 'Controller with this name already exists'
              : true;
          }

          return 'The name is required';
        },
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'src/api/{{kebabCase name}}/{{kebabCase name}}.module.ts',
        templateFile: './controller/Controller.module.ts.hbs',
      },
      {
        type: 'add',
        path: 'src/api/{{kebabCase name}}/{{kebabCase name}}.service.ts',
        templateFile: './controller/Controller.service.ts.hbs',
      },
      {
        type: 'add',
        path: 'src/api/{{kebabCase name}}/{{kebabCase name}}.controller.ts',
        templateFile: './controller/Controller.controller.ts.hbs',
      },
      {
        type: 'add',
        path: 'src/api/{{kebabCase name}}/{{kebabCase name}}.dto.ts',
        templateFile: './controller/Controller.dto.ts.hbs',
      },
      {
        type: 'add',
        path: 'src/api/index.ts',
        templateFile: './controller/index.ts.hbs',
      },
      {
        type: 'append',
        path: 'src/app.module.ts',
        pattern: /imports: \[/,
        template: `    {{pascalCase name}}Module,`,
      },
      {
        type: 'append',
        path: 'src/app.module.ts',
        pattern: /from '@nestjs\/common';/,
        template: `import { {{pascalCase name}}Module } from './api/{{kebabCase name}}/{{kebabCase name}}.module';`,
      },
    ],
  });
};
