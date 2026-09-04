# PlanForge - Enterprise Project Management System

A full-stack, production-grade Project Management System with Role-Based Access Control (RBAC), relational data modeling, dynamic project progress calculations, interactive Kanban task boards, project discussion streams, and workspace analytics.

---

## 🚀 Key Features

### 1. Multi-Role Authorization & Security
* **Super Admin**: Unrestricted administrative privileges across all projects, clients, users, tasks, comments, and system configs.
* **Admin (Project Manager)**: Full control over project lifecycles, team assignments, client accounts, and deliverables.
* **Team Member**: Access scoped to assigned projects and tasks; can update task progress, status, and collaborate on comments.
* **Client**: Scoped visibility strictly limited to their organization's contracted projects, milestones, and deliverable status.

### 2. Project Progress Calculation Engine
Project completion percentage is calculated dynamically based on task weights and statuses:
$$\text{Project Progress} = \frac{1}{N} \sum_{i=1}^{N} \text{Task Progress}_i$$
* **Completed Task**: 100% completion weight
* **Review Task**: Minimum 75% progress weight
* **In Progress Task**: Minimum 50% progress weight
* **To Do Task**: 0% progress default (or custom logged value)
* Projects automatically transition to **COMPLETED** when all tasks reach 100%.

### 3. Interactive Kanban Board
* 4-Stage lifecycle board: `To Do` ➔ `In Progress` ➔ `Review` ➔ `Completed`.
* Native HTML5 drag-and-drop support + rapid one-click stage transition controls.
* Filterable by active project and team member assignee.

### 4. Relational Database Architecture & Prisma Schema
* **User**: Authentication credentials, roles, profile metadata.
* **Client**: Client companies, primary contacts, addresses.
* **Project**: Deliverable pipelines with client associations, priority, status, start/due dates.
* **ProjectMember**: Many-to-many junction joining Users with Projects.
* **Task**: Granular deliverable items with status, priority, progress %, deadline, and assigned user.
* **Comment**: Chronological discussion feed attached to projects and tasks.

---

## 🔑 Demo Logins

| Role | Name | Email | Permissions |
| :--- | :--- | :--- | :--- |
| **Super Admin** | Alex Vance | `alex@planforge.io` | `Admin@123` | Root system access |
| **Admin** | Sarah Connor | `sarah@planforge.io` | `Admin@123` | Project & team management |
| **Team Member** | David Kim | `david@planforge.io` | `User@123` | Assigned deliverables |
| **Team Member** | Elena Rostova | `elena@planforge.io` | `User@123` | Assigned deliverables |
| **Client** | Jonathan Sterling | `jonathan@acmecorp.com` | `Client@123` | Scoped client viewer |

*(You can also use the **Switch Role** dropdown in the top navigation bar to test any persona instantly with 1 click).*

---

## 🛠️ API Endpoints Summary

### Auth
* `POST /api/auth/login` - Authenticate user & issue JWT
* `POST /api/auth/register` - Create new user account & issue JWT
* `GET /api/auth/me` - Get authenticated profile

### Projects
* `GET /api/projects` - List scoped projects with filters
* `POST /api/projects` - Create project (Admin/SuperAdmin)
* `GET /api/projects/:id` - Detailed project view with tasks and members
* `PATCH /api/projects/:id` - Update project attributes
* `DELETE /api/projects/:id` - Cascading delete of project and deliverables
* `POST /api/projects/:id/members` - Assign team member
* `DELETE /api/projects/:id/members/:userId` - Remove team member

### Tasks & Kanban
* `GET /api/tasks` - List tasks with project & status filters
* `POST /api/tasks` - Create deliverable item
* `PATCH /api/tasks/:id` - Update task attributes
* `PATCH /api/tasks/:id/status` - Transition status across Kanban
* `PATCH /api/tasks/:id/progress` - Update progress percentage
* `DELETE /api/tasks/:id` - Remove task

### Comments
* `GET /api/projects/:id/comments` - Project discussion feed
* `POST /api/projects/:id/comments` - Post comment
* `DELETE /api/comments/:id` - Delete comment (author or admin)

### Dashboard
* `GET /api/dashboard/stats` - High-level metrics & lifecycle breakdown
* `GET /api/dashboard/recent-projects` - Recent project pipelines
* `GET /api/dashboard/recent-tasks` - Active assigned tasks
* `POST /api/dashboard/reset-seed` - Reset demo database
