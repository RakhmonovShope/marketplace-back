import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PageableDto } from 'common/common.dto';

export class CreateCar {
@IsString()
@IsNotEmpty()
@ApiProperty({
description: 'Name Uz of the car in Uzbek',
example: 'car Uz',
})
nameUz: string;

@IsString()
@IsNotEmpty()
@ApiProperty({
description: 'Name Ru of the car in Russian',
example: 'car Ru',
})
nameRu: string;

@IsString()
@IsNotEmpty()
@ApiProperty({
description: 'Cover ru of the car',
example: '/2024/9/25/4649dbd6-3d0f-4de2-96e1-46a1584125cb.jpg',
})
coverRu: string;

@IsString()
@IsNotEmpty()
@ApiProperty({
description: 'Cover uz of the car',
example: '/2024/9/25/4649dbd6-3d0f-4de2-96e1-46a1584125cb.jpg',
})
coverUz: string;

@IsBoolean()
@ApiProperty({
description: 'Indicates if the car is active',
example: true,
})
active: boolean;
}

export class UpdateCar extends CreateCar {
@IsString()
@IsNotEmpty()
@ApiProperty({
description: 'Unique identifier for the car',
example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
})
id: string;
}

export class CarResponse {
@ApiProperty({
description: 'Unique identifier for the car',
example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
})
id: string;

@ApiProperty({
description: 'Name of the car in Uzbek',
example: 'Sahifa',
})
nameUz: string;

@ApiProperty({
description: 'Name of the car in Russian',
example: 'Страница',
})
nameRu: string;

@IsString()
@IsNotEmpty()
@ApiProperty({
description: 'Cover ru of the car',
example: '/2024/9/25/4649dbd6-3d0f-4de2-96e1-46a1584125cb.jpg',
})
coverRu: string;


@IsString()
@IsNotEmpty()
@ApiProperty({
description: 'Cover uz of the car',
example: '/2024/9/25/4649dbd6-3d0f-4de2-96e1-46a1584125cb.jpg',
})
coverUz: string;

@IsBoolean()
@ApiProperty({
description: 'Indicates if the car is active',
example: true,
})
active: boolean;

@ApiProperty({
description: 'Timestamp when the car was created',
example: '2024-01-01T00:00:00.000Z',
})
createdAt: Date;

@ApiProperty({
description: 'Timestamp when the car was last updated',
example: '2024-01-02T00:00:00.000Z',
})
updatedAt: Date;
}


export class PageableResponseDto extends PageableDto {
@ApiProperty({
description: 'Array of items for the current page',
isArray: true,
})
data: CarResponse[];
}
