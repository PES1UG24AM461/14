import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { listUsers, updateUserRole } from '../services/userManagement.js';

// Administrator User and Role Management Router (SAD 4.3, FR-026).
export function createUserManagementRouter(
  auth = authenticate,
  adminAuth = authorize('administrator')
) {
  const router = Router();
  const adminOnly = [auth, adminAuth];

  // GET /api/admin/users - list users and roles for role management (SAD 4.3, FR-026)
  router.get('/admin/users', adminOnly, async (_req, res, next) => {
    try {
      const users = await listUsers();
      return res.status(200).json({ users });
    } catch (err) {
      return next(err);
    }
  });

  // PATCH /api/admin/users/:userId/role - change a user's role (SAD 4.3, FR-026, TC-ADM-03)
  router.patch('/admin/users/:userId/role', adminOnly, async (req, res, next) => {
    try {
      const user = await updateUserRole(req.params.userId, req.body?.role);
      return res.status(200).json({ user });
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

export default createUserManagementRouter();
