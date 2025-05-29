import { IsString, IsNotEmpty, IsDateString } from "class-validator";

export class CreateTodoDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    content: string;

    @IsString()
    @IsNotEmpty()
    group: string;

    @IsDateString()
    @IsNotEmpty()
    datetime: string;
}
