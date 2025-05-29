import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { TodoService } from './todo.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { CreateSubtaskDto } from './dto/create-subtask.dto';

@Controller('todo')
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @Post()
  create(@Body() createTodoDto: CreateTodoDto) {
    return this.todoService.create(createTodoDto);
  }

  @Get()
  findAll() {
    return this.todoService.findAll();
  }

  @Get('by-deadline')
  findByDeadline(@Query('date') date: string) {
    return this.todoService.findbydeadline(date);
  }

  @Get('search')
  search(@Query('query') query: string) {
    return this.todoService.search(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.todoService.findOne(id);
  }

  @Get(':id/subtask')
  findSubtasks(@Param('id') id: string) {
    return this.todoService.findSubtasks(id);
  }

  @Post(':id/subtask')
  addSubtask(@Param('id') id: string, @Body() createSubtaskDto: CreateSubtaskDto) {
    return this.todoService.addSubtask(id, createSubtaskDto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTodoDto: UpdateTodoDto) {
    return this.todoService.update(id, updateTodoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.todoService.remove(id);
  }
}
