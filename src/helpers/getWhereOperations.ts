interface Filter {
  name: string;
  operation: '>' | '>=' | '<' | '<=' | '=' | '!=';
  value: string | number;
}

export const getWhereOperations: any = (filter: any) => {
  const where: any = {};

  filter.forEach((f: Filter) => {
    const fieldName = f.name;
    const value: any = f.value;

    switch (f.operation) {
      case '>':
        where[fieldName] = { gt: value };
        break;
      case '>=':
        where[fieldName] = { gte: value };
        break;
      case '<':
        where[fieldName] = { lt: value };
        break;
      case '<=':
        where[fieldName] = { lte: value };
        break;
      case '=':
        where[fieldName] = { equals: value };
        break;
      case '!=':
        where[fieldName] = { not: value };
        break;
      default:
        throw new Error(`Unsupported filter operation: ${f.operation}`);
    }
  });

  return where;
};
