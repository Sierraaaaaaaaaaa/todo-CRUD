import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, HydratedDocument, Types } from "mongoose";


export type TodoDocument = HydratedDocument<Todo>;

@Schema({ timestamps: true })
export class Todo extends Document {
    @Prop({ required: true })
    title: string;

    @Prop()
    content: string;

    @Prop()
    Tgroup: string;

    @Prop({ type: Types.ObjectId, ref: 'Todo', default: null })
    parentTask: Types.ObjectId | null;
  
    // List of subtask IDs (tasks that are children of this task)
    @Prop({ type: [{ type: Types.ObjectId, ref: 'Todo' }], default: [] })
    subTasks: Types.ObjectId[];

    @Prop({required: true, enum: ['To do', 'In progress', 'Done'], default: 'To do'})
    status: string;

    @Prop({required: true})
    datetime: Date;
}

export const TodoSchema = SchemaFactory.createForClass(Todo);