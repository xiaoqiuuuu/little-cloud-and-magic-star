import { Navigate, useOutletContext } from 'react-router-dom';
import {
  getDefaultAccessPath,
  hasAnyPermission,
  hasPermission,
} from '../utils/adminAccess';


function RequirePermission({ permission, anyOf, children }) {
  const { currentUser } = useOutletContext();

  if (!currentUser) {
    return <Navigate to="/admin/login" replace />;
  }

  const allowed = permission
    ? hasPermission(currentUser, permission)
    : hasAnyPermission(currentUser, anyOf || []);
  if (!allowed) {
    return <Navigate to={getDefaultAccessPath(currentUser)} replace />;
  }
  return children;
}


export default RequirePermission;
