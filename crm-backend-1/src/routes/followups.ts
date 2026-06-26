import { Router } from 'express';
import { createFollowup, getFollowups, updateFollowup, deleteFollowup } from '../controllers/followupsController';

const router = Router();

router.post('/', createFollowup);
router.get('/', getFollowups);
router.put('/:id', updateFollowup);
router.delete('/:id', deleteFollowup);

export default router;