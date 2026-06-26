import { Pool } from 'pg';
import { FollowupType } from '../types';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

export const createFollowup = async (followup: FollowupType) => {
    const { leadId, notes, followupDate } = followup;
    const result = await pool.query(
        'INSERT INTO followups (lead_id, notes, followup_date) VALUES ($1, $2, $3) RETURNING *',
        [leadId, notes, followupDate]
    );
    return result.rows[0];
};

export const getFollowupsByLeadId = async (leadId: number) => {
    const result = await pool.query(
        'SELECT * FROM followups WHERE lead_id = $1',
        [leadId]
    );
    return result.rows;
};

export const updateFollowup = async (id: number, followup: FollowupType) => {
    const { notes, followupDate } = followup;
    const result = await pool.query(
        'UPDATE followups SET notes = $1, followup_date = $2 WHERE id = $3 RETURNING *',
        [notes, followupDate, id]
    );
    return result.rows[0];
};

export const deleteFollowup = async (id: number) => {
    await pool.query('DELETE FROM followups WHERE id = $1', [id]);
};