# TrailQuest – Trip and Field Task Management System

## Project Description
TrailQuest is a system for managing trips, groups, guides, field workers, and field tasks.  
The system provides full control for the admin, guidance management for guides, task execution for field workers, and trip booking for regular users.

---

## Technologies
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MySQL

---

## User Types

### Admin
- Manage routes (trails)
- Manage groups
- Manage guides and field workers
- Create and manage tasks
- Handle field reports
- Configure system settings

### Guide
- View assigned trips
- Start and end a trip
- Submit field reports with images and notes
- View trip and group details

### Field Worker
- View assigned tasks
- Start and complete tasks
- Navigate to task location via map
- Submit field reports with images and notes

### Regular User (Group Representative)
- Book trips
- Select route and date
- Submit cancellation requests
- View group and trip details

---

## Main Features

### Authentication
- Login based on user role
- User registration with email verification
- Password recovery

### Route Management
- Add, edit, and delete routes
- View route details

### Group Management
- Create groups
- Assign guide and route
- Cancel group or replace guide

### Guidance Management
- Status tracking (Planned, In Progress, Completed)
- Start and end guidance
- Field reporting

### Field Reports
- Create reports with image and location
- Display location on map
- Create tasks from reports

### Task Management
- Create tasks manually or from reports
- Assign workers and roles
- Track task status

---

## Notes
The system is built with a separation between frontend and backend, with data stored in a database and access control based on user roles.