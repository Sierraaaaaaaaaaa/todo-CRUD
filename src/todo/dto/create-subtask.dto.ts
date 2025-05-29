import { IsString, IsNotEmpty, IsMongoId, IsDateString } from 'class-validator';

export class CreateSubtaskDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    content: string;


    readonly group: 'subtask' = 'subtask';

    @IsDateString()
    @IsNotEmpty()
    datetime: string;
}