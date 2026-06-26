# CRM Backend API

This is a backend service for a Customer Relationship Management (CRM) application built with Node.js, Express, and PostgreSQL. The API provides endpoints for managing users, leads, follow-ups, and authentication.

## Table of Contents

- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Error Handling](#error-handling)
- [CORS Support](#cors-support)
- [Deployment](#deployment)

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd crm-backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on the `.env.example` file and fill in the required environment variables.

## Environment Variables

The application requires the following environment variables:

- `DATABASE_URL`: Connection string for PostgreSQL database.
- Other variables as specified in the `.env.example` file.

## API Endpoints

The following API endpoints are available:

- **Authentication**
  - `POST /api/auth/login`: User login
  - `POST /api/auth/register`: User registration

- **Leads**
  - `GET /api/leads`: Retrieve all leads
  - `POST /api/leads`: Create a new lead
  - `GET /api/leads/:id`: Retrieve a lead by ID
  - `PUT /api/leads/:id`: Update a lead by ID
  - `DELETE /api/leads/:id`: Delete a lead by ID

- **Follow-ups**
  - `GET /api/followups`: Retrieve all follow-ups
  - `POST /api/followups`: Create a new follow-up
  - `GET /api/followups/:id`: Retrieve a follow-up by ID
  - `PUT /api/followups/:id`: Update a follow-up by ID
  - `DELETE /api/followups/:id`: Delete a follow-up by ID

- **Users**
  - `GET /api/users`: Retrieve all users
  - `GET /api/users/:id`: Retrieve a user by ID
  - `PUT /api/users/:id`: Update a user by ID
  - `DELETE /api/users/:id`: Delete a user by ID

- **Health Check**
  - `GET /api/health`: Check if the API is running

## Error Handling

The application includes a global error handler that captures and responds to errors in a consistent format.

## CORS Support

CORS is enabled for the application to allow cross-origin requests.

## Deployment

The backend is configured to be deployed on Render. Ensure that the `render.yaml` file is correctly set up for deployment.

For the frontend, ensure that the API base URL is correctly configured to point to the deployed backend service.

## License

This project is licensed under the MIT License. See the LICENSE file for details.