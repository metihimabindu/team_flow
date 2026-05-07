import { useAuth } from '../contexts/AuthContext';
import { Project } from '../types';

export function useIsProjectAdmin(project: Project | null): boolean {
  const { profile } = useAuth();
  if (!profile || !project) return false;
  return profile.id === project.adminId;
}
