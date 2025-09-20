import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://simplepro_app:simplepro_app_password_2024@localhost:27017/simplepro?authSource=simplepro',
      {
        retryWrites: true,
        writeConcern: {
          w: 'majority',
          j: true,
        },
        readPreference: 'primary',
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4, // Use IPv4, skip trying IPv6
      }
    ),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}