import { Request, Response, NextFunction } from 'express';
import cors from 'cors';

const corsOptions = {
  origin: '*', // Adjust this to specify allowed origins
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

const corsMiddleware = cors(corsOptions);

export default corsMiddleware;