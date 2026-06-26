import { Pool } from 'pg';
import { Lead } from '../types';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export const createLead = async (leadData: Lead) => {
    const { name, email, phone, status } = leadData;
    const result = await pool.query(
        'INSERT INTO leads (name, email, phone, status) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, email, phone, status]
    );
    return result.rows[0];
};

export const getLeads = async () => {
    const result = await pool.query('SELECT * FROM leads');
    return result.rows;
};

export const getLeadById = async (id: number) => {
    const result = await pool.query('SELECT * FROM leads WHERE id = $1', [id]);
    return result.rows[0];
};

export const updateLead = async (id: number, leadData: Lead) => {
    const { name, email, phone, status } = leadData;
    const result = await pool.query(
        'UPDATE leads SET name = $1, email = $2, phone = $3, status = $4 WHERE id = $5 RETURNING *',
        [name, email, phone, status, id]
    );
    return result.rows[0];
};

export const deleteLead = async (id: number) => {
    await pool.query('DELETE FROM leads WHERE id = $1', [id]);
};