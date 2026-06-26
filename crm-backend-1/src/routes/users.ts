import { Router } from 'express';
import {
  createUser,
  getUser,
  updateUser,
  deleteUser,
  getAllUsers,
} from '../controllers/usersController';

const router = Router();

// Route to create a new user
router.post('/', createUser);

// Route to get a specific user by ID
router.get('/:id', getUser);

// Route to update a specific user by ID
router.put('/:id', updateUser);

// Route to delete a specific user by ID
router.delete('/:id', deleteUser);

// Route to get all users
router.get('/', getAllUsers);

export default router;