import { Request, Response } from 'express';
import { Lead } from '../models/Lead';

// Create a new lead
export const createLead = async (req: Request, res: Response) => {
    try {
        const lead = await Lead.create(req.body);
        res.status(201).json(lead);
    } catch (error) {
        res.status(500).json({ message: 'Error creating lead', error });
    }
};

// Get all leads
export const getLeads = async (req: Request, res: Response) => {
    try {
        const leads = await Lead.findAll();
        res.status(200).json(leads);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving leads', error });
    }
};

// Get a lead by ID
export const getLeadById = async (req: Request, res: Response) => {
    try {
        const lead = await Lead.findByPk(req.params.id);
        if (lead) {
            res.status(200).json(lead);
        } else {
            res.status(404).json({ message: 'Lead not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving lead', error });
    }
};

// Update a lead
export const updateLead = async (req: Request, res: Response) => {
    try {
        const [updated] = await Lead.update(req.body, {
            where: { id: req.params.id }
        });
        if (updated) {
            const updatedLead = await Lead.findByPk(req.params.id);
            res.status(200).json(updatedLead);
        } else {
            res.status(404).json({ message: 'Lead not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error updating lead', error });
    }
};

// Delete a lead
export const deleteLead = async (req: Request, res: Response) => {
    try {
        const deleted = await Lead.destroy({
            where: { id: req.params.id }
        });
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(404).json({ message: 'Lead not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error deleting lead', error });
    }
};