import { Router } from 'express';
import { createLead, getLeads, getLeadById, updateLead, deleteLead } from '../controllers/leadsController';

const router = Router();

// Route to create a new lead
router.post('/', createLead);

// Route to get all leads
router.get('/', getLeads);

// Route to get a lead by ID
router.get('/:id', getLeadById);

// Route to update a lead by ID
router.put('/:id', updateLead);

// Route to delete a lead by ID
router.delete('/:id', deleteLead);

export default router;