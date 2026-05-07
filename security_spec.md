# Security Specification for TeamFlow Pro

## Data Invariants
1. **Project Integrity**: Every task and activity log must reside within a valid project path.
2. **Membership Lock**: Access to any project resource (tasks, logs) is strictly gated by the project's `members` collection/list.
3. **Role Enforcement**:
   - `adminId` (Creator) has full control over the project and its members.
   - `members` can only view the project and update tasks assigned to them.
4. **Immutable Identities**: `adminId`, `creatorId`, `projectId`, and `ownerId` fields remain constant after creation.
5. **System Verification**: All timestamps must be server-generated (`request.time`).

## The "Dirty Dozen" Payloads (Denial Tests)
1. **Self-Promotion**: Non-admin user attempts to add themselves to a project they don't belong to.
2. **Project Hijack**: User attempts to update `adminId` of a project to their own UID.
3. **Ghost Task**: Attempt to create a task for a project the user is not a member of.
4. **Shadow Field Injection**: Adding `isVerified: true` to a user profile update.
5. **PII Leak**: Non-member attempting to read the `members` list or user profiles of a project.
6. **Task Stealing**: Member A updates a task assigned to Member B (and Member A is not the Admin).
7. **Role Escalation**: User updating their own global `role` from `member` to `admin`.
8. **Orphaned Writes**: Creating a task with a `projectId` that doesn't exist in the database.
9. **Identity Spoofing**: Creating a task and setting `creatorId` to a different user's UID.
10. **Terminal State Bypass**: Updating a task that is already marked as 'done' to change its `dueDate`.
11. **Resource Poisoning**: Pushing a 1MB string as a task title.
12. **Timestamp Forgery**: Providing a client-side `updatedAt` value instead of `request.time`.

## Firestore Rules Draft
(To follow in `DRAFT_firestore.rules`)
