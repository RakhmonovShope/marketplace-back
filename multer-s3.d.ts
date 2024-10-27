declare namespace Express {
  export interface MulterS3File extends Multer.File {
    location: string; // URL of the uploaded file in S3
  }
}
