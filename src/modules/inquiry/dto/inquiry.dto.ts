import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { messageFactory, messages } from '@app/shared/messages.shared';

export class CreateInquiryDto {
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
    @IsNotEmpty({ message: messageFactory(messages.W2, ['Property Id']) })
    @IsUUID('4', { message: messageFactory(messages.W1, ['Property Id']) })
    readonly propertyId!: string;

    @ApiProperty({ example: 'I would like to schedule a visit this weekend.' })
    @IsNotEmpty({ message: messageFactory(messages.W2, ['Message']) })
    @IsString({ message: messageFactory(messages.W1, ['Message']) })
    readonly message!: string;
}
