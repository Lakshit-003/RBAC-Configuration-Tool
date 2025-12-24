# Prisma Schema Design Documentation

## Overview

This document explains the RBAC (Role-Based Access Control) database schema design, architectural decisions, and scalability considerations.

## Schema Architecture

### Core Models

#### 1. User Model

**Purpose**: Represents authenticated users in the system.

**Key Design Decisions**:

- **UUID Primary Key**: Uses `@db.Char(36)` for MySQL compatibility. UUIDs prevent enumeration attacks and provide better security than auto-incrementing IDs.
- **Email Uniqueness**: Enforced at database level with `@unique` constraint and index for fast lookups.
- **Password Storage**: Stores bcrypt-hashed passwords (handled by application layer, not Prisma).
- **Timestamps**: `createdAt` and `updatedAt` for audit trails.

**Scalability**: Indexed email field ensures O(log n) lookup performance even with millions of users.

---

#### 2. Role Model

**Purpose**: Represents roles that can be assigned to users (e.g., "admin", "editor", "viewer").

**Key Design Decisions**:

- **UUID Primary Key**: Consistent with User model for referential integrity.
- **Name Uniqueness**: Prevents duplicate roles. Indexed for fast role lookups.
- **Flexible Naming**: 100-character limit allows descriptive role names.

**Scalability**: Role names are indexed, enabling fast role-based queries. Typical RBAC systems have 10-50 roles, so this scales well.

---

#### 3. Permission Model

**Purpose**: Represents granular permissions using the "resource:action" pattern.

**Key Design Decisions**:

- **Naming Convention**: Uses "resource:action" format (e.g., `post:edit`, `user:delete`, `dashboard:view`).
- **Optional Description**: Allows documentation of permission purpose without cluttering the name.
- **Unique Constraint**: Prevents duplicate permissions.

**Example Permissions**:

- `post:create`
- `post:edit`
- `post:delete`
- `user:view`
- `user:edit`
- `dashboard:admin`

**Scalability**: Permission names are indexed. Most systems have 50-200 permissions, which scales efficiently.

---

### Junction Tables

#### 4. UserRole (Many-to-Many: User ↔ Role)

**Purpose**: Links users to their assigned roles.

**Key Design Decisions**:

- **Composite Primary Key**: `(userId, roleId)` ensures a user cannot have the same role twice.
- **Cascade Delete**: When a user or role is deleted, associated UserRole records are automatically removed.
- **Indexes**: Both foreign keys are indexed for fast lookups in both directions.
- **Audit Trail**: `createdAt` timestamp tracks when roles were assigned.

**Query Patterns**:

- Find all roles for a user: `db.userRole.findMany({ where: { userId } })`
- Find all users with a role: `db.userRole.findMany({ where: { roleId } })`

**Scalability**: Junction tables scale linearly. With proper indexes, queries remain fast even with millions of user-role assignments.

---

#### 5. RolePermission (Many-to-Many: Role ↔ Permission)

**Purpose**: Links roles to their assigned permissions.

**Key Design Decisions**:

- **Composite Primary Key**: `(roleId, permissionId)` ensures a role cannot have the same permission twice.
- **Cascade Delete**: When a role or permission is deleted, associated RolePermission records are automatically removed.
- **Indexes**: Both foreign keys are indexed for efficient permission checks.
- **Audit Trail**: `createdAt` timestamp tracks when permissions were assigned to roles.

**Query Patterns**:

- Find all permissions for a role: `db.rolePermission.findMany({ where: { roleId } })`
- Find all roles with a permission: `db.rolePermission.findMany({ where: { permissionId } })`

**Scalability**: Role-permission assignments are typically static (roles don't change frequently), so this scales very well.

---

## Relationship Flow

```
User ──(UserRole)──> Role ──(RolePermission)──> Permission
```

**How RBAC Works**:

1. User has one or more Roles (via UserRole)
2. Each Role has one or more Permissions (via RolePermission)
3. To check if a user can perform an action:
   - Get user's roles → Get roles' permissions → Check if permission exists

**Example**:

- User "john@example.com" has Role "editor"
- Role "editor" has Permissions: ["post:edit", "post:create"]
- Therefore, user "john@example.com" can edit and create posts

---

## MySQL-Specific Considerations

### UUID Handling

- **`@db.Char(36)`**: MySQL doesn't have native UUID type, so we use CHAR(36) to store UUID strings.
- **`@default(uuid())`**: Prisma generates UUIDs automatically using the database's UUID function (or application-level generation).

### Table Naming

- **Snake_case Tables**: Using `@@map("table_name")` for database tables follows MySQL conventions.
- **CamelCase Fields**: Prisma uses camelCase for fields, which maps to snake_case in MySQL via `@map()`.

### Indexes

- **Foreign Key Indexes**: All foreign keys are explicitly indexed for query performance.
- **Unique Field Indexes**: Email, role name, and permission name are indexed for fast lookups.

### Cascade Deletes

- **Data Integrity**: Cascade deletes ensure no orphaned records in junction tables.
- **User Deletion**: Deleting a user removes all UserRole records.
- **Role Deletion**: Deleting a role removes all UserRole and RolePermission records.

---

## Scalability Analysis

### Performance Characteristics

1. **User Lookup**: O(log n) - Indexed email field
2. **Role Assignment**: O(1) - Direct foreign key lookup
3. **Permission Check**: O(m) where m = number of user's roles (typically 1-5)
4. **Role-Permission Lookup**: O(1) - Indexed junction table

### Expected Scale

- **Users**: 1,000 - 100,000 (enterprise internal tool)
- **Roles**: 10 - 50 (typical RBAC systems)
- **Permissions**: 50 - 200 (granular control)
- **UserRole Assignments**: ~2-5 per user average
- **RolePermission Assignments**: ~5-20 per role average

### Optimization Strategies

1. **Indexes**: All foreign keys and unique fields are indexed.
2. **Composite Keys**: Junction tables use composite primary keys for uniqueness and performance.
3. **Cascade Deletes**: Prevents orphaned records and maintains data integrity.
4. **UUIDs**: Better for distributed systems and prevents enumeration attacks.

---

## Security Considerations

1. **UUID Primary Keys**: Prevent user enumeration attacks (can't guess user IDs).
2. **Password Hashing**: Application layer handles bcrypt hashing (not stored in schema).
3. **Cascade Deletes**: Prevents orphaned records that could cause security issues.
4. **Unique Constraints**: Prevents duplicate roles/permissions that could cause confusion.

---

## Migration Strategy

### Initial Migration

```bash
npx prisma migrate dev --name init
```

This will:

1. Create all tables with proper indexes
2. Set up foreign key constraints
3. Create unique constraints
4. Set up cascade delete rules

### Future Migrations

- Add new fields: `npx prisma migrate dev --name add_field_name`
- Modify relationships: Prisma will generate appropriate ALTER TABLE statements
- Add indexes: Prisma handles index creation automatically

---

## Best Practices Followed

✅ **UUID Primary Keys**: Better security and scalability  
✅ **Explicit Relations**: Named relations prevent ambiguity  
✅ **Cascade Deletes**: Maintains referential integrity  
✅ **Indexes on Foreign Keys**: Optimizes query performance  
✅ **Composite Primary Keys**: Ensures uniqueness in junction tables  
✅ **Snake_case Tables**: Follows MySQL conventions  
✅ **CamelCase Fields**: Follows Prisma/TypeScript conventions  
✅ **Audit Timestamps**: Tracks creation and updates  
✅ **Unique Constraints**: Prevents data duplication  
✅ **Proper MySQL Types**: Uses `@db.Char(36)` for UUIDs

---

## Query Examples

### Get User with Roles and Permissions

```typescript
const user = await db.user.findUnique({
  where: { email: "admin@example.com" },
  include: {
    userRoles: {
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    },
  },
});
```

### Check if User Has Permission

```typescript
const hasPermission = await db.userRole.findFirst({
  where: {
    userId: user.id,
    role: {
      rolePermissions: {
        some: {
          permission: {
            name: "post:edit",
          },
        },
      },
    },
  },
});
```

### Assign Role to User

```typescript
await db.userRole.create({
  data: {
    userId: user.id,
    roleId: role.id,
  },
});
```

---

## Conclusion

This schema design provides:

- **Scalability**: Handles thousands of users and hundreds of permissions efficiently
- **Security**: UUIDs, proper constraints, and cascade deletes
- **Maintainability**: Clear relationships, explicit naming, and proper indexes
- **Performance**: Optimized indexes and efficient query patterns
- **Flexibility**: Easy to extend with additional fields or relationships

The design follows RBAC best practices and is production-ready for an internal enterprise tool.
