import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Todo } from './schemas/todo.schema';
import { Model, Types } from 'mongoose';
import path from 'path';



@Injectable()
export class TodoService {
  constructor (@InjectModel(Todo.name) private todoModel: Model<Todo>) {}

  //add task
  async create(createTodoDto: CreateTodoDto): Promise<Todo> {
    try {
      if (createTodoDto.group == 'subtask'){
        throw new BadRequestException('Subtasks cannot be created directly');
      }
      return this.createTask(createTodoDto);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create task: ' + error.message);
    }
  }

  //find all the big task
  async findAll(): Promise<Todo[]> {
    try {
      return this.todoModel.find({ 
        Tgroup: { $ne: 'subtask' } 
      }).exec();
    } catch (error) {
      throw new BadRequestException('Failed to fetch tasks: ' + error.message);
    }
  }

  //find specific task
  async findOne(id: string): Promise<Todo> {
    try {
      const task = await this.findTaskById(id);
      return task;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch task: ' + error.message);
    }
  }

  async findbydeadline(date: string): Promise<Todo[]> {
    try {
      // Convert input date string to Date object
      const inputDate = new Date(date);
      if (isNaN(inputDate.getTime())) {
        throw new BadRequestException('Invalid date format. Please use YYYY-MM-DD format.');
      }

      // Create start date (midnight of the given date)
      const startDate = new Date(inputDate);
      startDate.setHours(0, 0, 0, 0);

      // Create end date (midnight of the next day)
      const endDate = new Date(inputDate);
      endDate.setHours(23, 59, 59, 999);

      return this.todoModel.find({ 
        datetime: {
          $gte: startDate,
          $lte: endDate
        }
      }).exec();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch tasks by deadline: ' + error.message);
    }
  }

  async search(query: string): Promise<Todo[]>{
    try {
      return this.todoModel.aggregate([
        {
          $search: {
            index: 'todo-search-index',
            text: {
              query: query,
              path: ['title', 'content', 'Tgroup'],
            },
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            content: 1,
            status: 1,
            Tgroup: 1,
            dateTime: 1,
            parentTask: 1,
            subTasks: 1,
            createdAt: 1,
            updatedAt: 1,
            score: { $meta: 'searchScore' },
          },
        },
        {
          $lookup: {
            from: 'todos',
            localField: 'parentTask',
            foreignField: '_id',
            as:'parentTask',
          },
        },
        {
          $lookup: {
            from: 'todos',
            localField: 'subTasks',
            foreignField: '_id',
            as:'subTasks',
          },
        },
      ]).exec();
    } catch (error) {
      throw new BadRequestException('Failed to search tasks: ' + error.message);
    }
  }

  //update task info
  async update(id: string, updateTodoDto: UpdateTodoDto): Promise<Todo> {
    try {
      const task = await this.findTaskById(id);

      
      // Create update data object with proper types
      const updateData: Partial<Todo> = {};
      
      if (updateTodoDto.title) updateData.title = updateTodoDto.title;
      if (updateTodoDto.content) updateData.content = updateTodoDto.content;
      if (updateTodoDto.group) {
        if (updateTodoDto.group === 'subtask'){
          throw new BadRequestException('User are not allow to change a group to subtask')
        }
        if (task.Tgroup === 'subtask'){
          throw new BadRequestException('User are not allow to change group of a subtask task')
        }
        updateData.Tgroup = updateTodoDto.group;
      }
      if (updateTodoDto.datetime) updateData.datetime = new Date(updateTodoDto.datetime);

      const updatedTask = await this.todoModel.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
      ).exec();

      if (!updatedTask) {
        throw new NotFoundException(`Todo with ID "${id}" not found`);
      }

      return updatedTask;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update task: ' + error.message);
    }
  }

  //update task's subtask
  async addSubtask(parentId: string, createSubtaskDto: CreateSubtaskDto): Promise<Todo> {
    try {
      // Verify parent task exists
      const parentTask = await this.findTaskById(parentId);
      
      const datetime = new Date(createSubtaskDto.datetime);
      if (isNaN(datetime.getTime())) {
        throw new BadRequestException('Invalid date format. Please use ISO 8601 format (e.g. "2025-05-28T10:30:00Z")');
      }
      if (datetime.getTime() < Date.now() || datetime.getTime() > parentTask.datetime.getTime()){
        throw new BadRequestException('Invalid deadline');
      }

      // Create the subtask
      const subtaskData: Partial<Todo> = {
        title: createSubtaskDto.title,
        content: createSubtaskDto.content,
        Tgroup: 'subtask',
        parentTask: new Types.ObjectId(parentId),
        datetime: datetime
      };

      const createdSubtask = new this.todoModel(subtaskData);
      const savedSubtask = await createdSubtask.save();

      // Update parent's subtasks array
      await this.todoModel.findByIdAndUpdate(
        parentId,
        { $push: { subTasks: savedSubtask._id } }
      ).exec();

      return savedSubtask;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create subtask: ' + error.message);
    }
  }

  //remove a task
  async remove(id: string) {
    try {
      const task = await this.findTaskById(id);

      // Check if task has subtasks
      if (task.subTasks && task.subTasks.length > 0) {
        throw new BadRequestException('Cannot delete a task that has subtasks. Please delete all subtasks first.');
      }

      // If this is a subtask, remove it from parent's subtasks array
      if (task.parentTask) {
        await this.todoModel.findByIdAndUpdate(
          task.parentTask,
          { $pull: { subTasks: task._id } }
        ).exec();
      }

      // Delete the task itself
      const deletedTask = await this.todoModel.findByIdAndDelete(id).exec();
      if (!deletedTask) {
        throw new NotFoundException(`Task with ID "${id}" not found`);
      }

      return {
        message: 'Task deleted successfully',
        task: deletedTask
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to delete task: ' + error.message);
    }
  }
  async findSubtasks(id: string): Promise<Todo[]> {
    try {
      // Verify parent task exists
      const task = await this.findTaskById(id);
      if (task.Tgroup === 'subtask'){
        throw new BadRequestException('Cannot find a subtask of a task that has already been a subtask');
      }
      
      // Find all subtasks that have this task as parent
      return this.todoModel.find({ 
        parentTask: new Types.ObjectId(id),
        Tgroup: 'subtask'
      }).exec();
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to fetch subtasks: ' + error.message);
    }
  }

  //function 
  private async findTaskById(id: string): Promise<Todo> {
    try {
      const task = await this.todoModel.findById(id).exec();
      if (!task) {
        throw new NotFoundException('Cannot find this task');
      }
      return task;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Invalid task ID or database error: ' + error.message);
    }
  }

  private async createTask(createTodoDto: CreateTodoDto) {
    try {
      const todoData: Partial<Todo> = {
        title: createTodoDto.title,
        content: createTodoDto.content,
        Tgroup: createTodoDto.group,
        datetime: new Date(createTodoDto.datetime)
      };
      
      if (!todoData.datetime || isNaN(todoData.datetime.getTime())) {
        throw new BadRequestException('Invalid date format. Please use ISO 8601 format (e.g. "2025-05-28T10:30:00Z")');
      }
      if (todoData.datetime.getTime() < Date.now()){
        throw new BadRequestException('Invalid deadline, deadline must be in the future');
      }
      
      const createdTodo = new this.todoModel(todoData);
      return createdTodo.save();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to create todo: ' + error.message);
    }
  }


}
