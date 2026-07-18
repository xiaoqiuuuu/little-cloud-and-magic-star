import { Navigate, useOutletContext } from 'react-router-dom';


function RequireSuperAdmin({ children }) {
  const { currentUser } = useOutletContext();

  if (!currentUser) {
    return <Navigate to="/admin/login" replace />;
  }
  if (currentUser.role !== 'super_admin') {
    return <Navigate to="/admin/questions" replace />;
  }
  return children;
}


export default RequireSuperAdmin;
