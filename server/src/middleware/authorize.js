
const VALID_ROLES = ['student', 'faculty', 'administrator'];

export function authorize(...allowedRoles) {
  if (
    allowedRoles.length === 0 ||
    allowedRoles.some((role) => !VALID_ROLES.includes(role))
  ) {
    throw new Error('Invalid or missing allowed roles');
  }

  return function roleAuthorization(req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'You do not have permission to access this resource',
      });
    }

    return next();
  };
}
