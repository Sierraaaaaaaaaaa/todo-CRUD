import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { TodoModule } from './todo/todo.module';

@Module({
  imports: [MongooseModule.forRoot('mongodb+srv://hoangsondoanngoc3:Sh28UUqaJJgt0az1@cluster0.6ca3iu7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'), TodoModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
