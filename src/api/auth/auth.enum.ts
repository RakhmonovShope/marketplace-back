export enum PERMISSIONS {
  MESSAGE__CREATE = 'MESSAGE__CREATE',
  MESSAGE__VIEW = 'MESSAGE__VIEW',
  MESSAGE__UPDATE = 'MESSAGE__UPDATE',
  MESSAGE__DELETE = 'MESSAGE__DELETE',
  //AUDIO
  AUDIO__VIEW = 'AUDIO__VIEW',
  AUDIO__UPLOAD = 'AUDIO__UPLOAD',
  AUDIO__DELETE = 'AUDIO__DELETE',

  //Admin
  ADMIN__CREATE = 'ADMIN__CREATE',
  ADMIN__VIEW = 'ADMIN__VIEW',
  ADMIN__UPDATE = 'ADMIN__UPDATE',
  ADMIN__DELETE = 'ADMIN__DELETE',

  //Role
  ROLE__CREATE = 'ROLE__CREATE',
  ROLE__VIEW = 'ROLE__VIEW',
  ROLE__UPDATE = 'ROLE__UPDATE',
  ROLE__DELETE = 'ROLE__DELETE',
  ROLE__PERMISSION__VIEW = 'ROLE__PERMISSION__VIEW',

  //Category
  CATEGORY__CREATE = 'CATEGORY__CREATE',
  CATEGORY__VIEW = 'CATEGORY__VIEW',
  CATEGORY__UPDATE = 'CATEGORY__UPDATE',
  CATEGORY__DELETE = 'CATEGORY__DELETE',

  //File
  FILE__UPLOAD = 'FILE__UPLOAD',
  FILE__VIEW = 'FILE__VIEW',

  //PAGE
  PAGE__CREATE = 'PAGE__CREATE',
  PAGE__VIEW = 'PAGE__VIEW',
  PAGE__UPDATE = 'PAGE__UPDATE',
  PAGE__DELETE = 'PAGE__DELETE',

  //BADGE
  BADGE__CREATE = 'BADGE__CREATE',
  BADGE__VIEW = 'BADGE__VIEW',
  BADGE__UPDATE = 'BADGE__UPDATE',
  BADGE__DELETE = 'BADGE__DELETE',

  //BANNER
  BANNER__CREATE = 'BANNER__CREATE',
  BANNER__VIEW = 'BANNER__VIEW',
  BANNER__UPDATE = 'BANNER__UPDATE',
  BANNER__DELETE = 'BANNER__DELETE',

  //STORE
  STORE__CREATE = 'STORE__CREATE',
  STORE__VIEW = 'STORE__VIEW',
  STORE__UPDATE = 'STORE__UPDATE',
  STORE__DELETE = 'STORE__DELETE',

  //BRAND
  BRAND__CREATE = 'BRAND__CREATE',
  BRAND__VIEW = 'BRAND__VIEW',
  BRAND__UPDATE = 'BRAND__UPDATE',
  BRAND__DELETE = 'BRAND__DELETE',
}
