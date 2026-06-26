import { Pool } from 'pg';
import { User } from '../types';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export const createUser = async (userData: User) => {
    const { name, email, password } = userData;
    const result = await pool.query(
        'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
        [name, email, password]
    );
    return result.rows[0];
};

export const getUserById = async (id: number) => {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
};

export const getAllUsers = async () => {
    const result = await pool.query('SELECT * FROM users');
    return result.rows;
};

export const updateUser = async (id: number, userData: Partial<User>) => {
    const { name, email, password } = userData;
    const result = await pool.query(
        'UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email), password = COALESCE($3, password) WHERE id = $4 RETURNING *',
        [name, email, password, id]
    );
    return result.rows[0];
};

export const deleteUser = async (id: number) => {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
};