import { Module } from '@nestjs/common';
import { GraphQLModule as NestGraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { MongooseModule } from '@nestjs/mongoose';
import { join } from 'path';

// Import resolvers
import { JobsResolver, JobWithDetailsResolver } from './resolvers/jobs.resolver';
import { CustomersResolver } from './resolvers/customers.resolver';
import { AnalyticsResolver, CrewResolver } from './resolvers/analytics.resolver';

// Import DataLoaders
import { CustomerDataLoader } from './dataloaders/customer.dataloader';
import { EstimateDataLoader } from './dataloaders/estimate.dataloader';
import { CrewDataLoader } from './dataloaders/crew.dataloader';

// Import services
import { JobsModule } from '../jobs/jobs.module';
import { CustomersModule } from '../customers/customers.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AuthModule } from '../auth/auth.module';

// Import schemas for DataLoaders
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';

@Module({
  imports: [
    NestGraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      typePaths: ['./**/*.graphql'],
      definitions: {
        path: join(process.cwd(), 'apps/api/src/graphql/graphql.schema.ts'),
        outputAs: 'class',
      },
      playground: process.env.NODE_ENV !== 'production', // Enable GraphQL Playground in development
      introspection: true, // Enable introspection for GraphQL tools
      context: ({ req }) => ({ req }), // Pass request to context for auth guards
      formatError: (error) => {
        // Custom error formatting
        return {
          message: error.message,
          locations: error.locations,
          path: error.path,
          extensions: {
            code: error.extensions?.code,
            timestamp: new Date().toISOString(),
          },
        };
      },
    }),
    // Import Mongoose models for DataLoaders
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: User.name, schema: UserSchema },
    ]),
    // Import feature modules
    JobsModule,
    CustomersModule,
    AnalyticsModule,
    AuthModule,
  ],
  providers: [
    // Resolvers
    JobsResolver,
    JobWithDetailsResolver,
    CustomersResolver,
    AnalyticsResolver,
    CrewResolver,
    // DataLoaders (scoped to REQUEST for proper batching)
    CustomerDataLoader,
    EstimateDataLoader,
    CrewDataLoader,
  ],
  exports: [
    CustomerDataLoader,
    EstimateDataLoader,
    CrewDataLoader,
  ],
})
export class GraphQLModule {}
