import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS } from './auth.enum';

export const PERMISSIONS_KEY = 'permissions';

export const Permissions = (...permissions: PERMISSIONS[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
