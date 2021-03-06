import { Types, PluginFunction } from '@graphql-codegen/plugin-helpers';
import { parse, printSchema, visit, GraphQLSchema } from 'graphql';
import { NestJSGraphQLVisitor } from './visitor';
import { TsIntrospectionVisitor, includeIntrospectionDefinitions } from '@graphql-codegen/typescript';
import { NestJSGraphQLPluginConfig } from './config';

export * from './visitor';

const NESTJS_GRAPHQL_IMPORT = `import * as GQL from '@nestjs/graphql';`;
const isDefinitionInterface = (definition: string): boolean => definition.includes('@GQL.InterfaceType()');

export const plugin: PluginFunction<NestJSGraphQLPluginConfig, Types.ComplexPluginOutput> = (
  schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  config: NestJSGraphQLPluginConfig,
) => {
  const visitor = new NestJSGraphQLVisitor(schema, config);
  const printedSchema = printSchema(schema);
  const astNode = parse(printedSchema);
  const maybeValue = `export type Maybe<T> = ${visitor.config.maybeValue};`;
  const visitorResult = visit(astNode, { leave: visitor });
  const introspectionDefinitions = includeIntrospectionDefinitions(schema, documents, config);
  const scalars = visitor.scalarsDefinition;

  const definitions = visitorResult.definitions;
  // Sort output by interfaces first, classes last to prevent TypeScript errors
  definitions.sort(
    (definition1, definition2) => +isDefinitionInterface(definition2) - +isDefinitionInterface(definition1),
  );

  return {
    prepend: [...visitor.getEnumsImports(), maybeValue, NESTJS_GRAPHQL_IMPORT],
    content: [scalars, ...definitions, ...introspectionDefinitions].join('\n'),
  };
};

export { TsIntrospectionVisitor };
