import { Request, Response } from 'express';
import Followup from '../models/Followup';

// Create a new follow-up
export const createFollowup = async (req: Request, res: Response) => {
    try {
        const followup = new Followup(req.body);
        await followup.save();
        res.status(201).json(followup);
    } catch (error) {
        res.status(500).json({ message: 'Error creating follow-up', error });
    }
};

// Get all follow-ups
export const getFollowups = async (req: Request, res: Response) => {
    try {
        const followups = await Followup.find();
        res.status(200).json(followups);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching follow-ups', error });
    }
};

// Get a follow-up by ID
export const getFollowupById = async (req: Request, res: Response) => {
    try {
        const followup = await Followup.findById(req.params.id);
        if (!followup) {
            return res.status(404).json({ message: 'Follow-up not found' });
        }
        res.status(200).json(followup);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching follow-up', error });
    }
};

// Update a follow-up by ID
export const updateFollowup = async (req: Request, res: Response) => {
    try {
        const followup = await Followup.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!followup) {
            return res.status(404).json({ message: 'Follow-up not found' });
        }
        res.status(200).json(followup);
    } catch (error) {
        res.status(500).json({ message: 'Error updating follow-up', error });
    }
};

// Delete a follow-up by ID
export const deleteFollowup = async (req: Request, res: Response) => {
    try {
        const followup = await Followup.findByIdAndDelete(req.params.id);
        if (!followup) {
            return res.status(404).json({ message: 'Follow-up not found' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Error deleting follow-up', error });
    }
};