import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class Create {
  @IsString()
  @IsNotEmpty()
  nameUz: string;

  @IsString()
  @IsNotEmpty()
  nameRu: string;

  @IsArray()
  @IsNotEmpty()
  permissions: string[];
}

export class Update {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  nameUz: string;

  @IsString()
  @IsNotEmpty()
  nameRu: string;

  @IsArray()
  @IsNotEmpty()
  permissions: string[];
}
