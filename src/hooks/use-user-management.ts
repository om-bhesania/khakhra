import type { ActiveUser, MasterUserData } from '@/types/users';
import { Timestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from './use-auth';
import { useFirestoreCRUD } from './use-firebaseCRUD';

export function useUserManagement() {
  const { user } = useAuth();
  const {
    addDocument,
    readDocuments,
    updateDocument,
    readDocById,
    deleteDocument,
  } = useFirestoreCRUD();

  const [loading, setLoading] = useState(false);

  // Create or update master user data
  const updateMasterUserData = async (userData: Partial<MasterUserData>) => {
    if (!user) return null;

    try {
      setLoading(true);
      const existingUser = await readDocById<MasterUserData>('masterUserData', user.uid);

      if (existingUser) {
        await updateDocument('masterUserData', user.uid, {
          ...userData,
          updatedAt: Timestamp.now(),
        });
        return { ...existingUser, ...userData };
      } else {
        const newUserData: MasterUserData = {
          id: user.uid,
          email: user.email || '',
          displayName: user.displayName,
          roleId: 'employee', // default role
          permissions: {},
          status: 'active',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          lastLoginAt: Timestamp.now(),
          ...userData,
        };
        return await addDocument('masterUserData', newUserData);
      }
    } catch (error) {
      console.error('Error updating master user data:', error);
      toast.error('Failed to update user data');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update user's active status
  const updateActiveStatus = async (status: ActiveUser['status'] = 'online') => {
    if (!user) return;

    try {
      const activeUserData: ActiveUser = {
        id: `${user.uid}_${Date.now()}`, // Unique session ID
        userId: user.uid,
        email: user.email || '',
        displayName: user.displayName,
        roleId: '', // Will be updated after reading from masterUserData
        loginTime: Timestamp.now(),
        lastActiveTime: Timestamp.now(),
        status,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
        },
      };

      // Get role from masterUserData
      const masterData = await readDocById<MasterUserData>('masterUserData', user.uid);
      if (masterData) {
        activeUserData.roleId = masterData.roleId;
      }

      await addDocument('activeUsers', activeUserData);

      // Update last login in master data
      await updateMasterUserData({
        lastLoginAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating active status:', error);
      toast.error('Failed to update active status');
    }
  };

  // Get all active users
  const getActiveUsers = async (): Promise<ActiveUser[]> => {
    try {
      setLoading(true);
      return await readDocuments<ActiveUser>('activeUsers', {
        where: [{ field: 'status', operator: '==', value: 'online' }],
        orderBy: 'lastActiveTime',
        orderDirection: 'desc',
      });
    } catch (error) {
      console.error('Error fetching active users:', error);
      toast.error('Failed to fetch active users');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Clean up old active sessions
  const cleanupActiveSessions = async () => {
    try {
      // Get sessions older than 24 hours
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - 24);

      const oldSessions = await readDocuments<ActiveUser>('activeUsers', {
        where: [
          { field: 'lastActiveTime', operator: '<=', value: Timestamp.fromDate(cutoffTime) },
        ],
      });

      // Delete old sessions
      await Promise.all(
        oldSessions.map((session) => deleteDocument('activeUsers', session.id))
      );
    } catch (error) {
      console.error('Error cleaning up sessions:', error);
    }
  };

  // Update last active time
  const updateLastActive = async () => {
    if (!user) return;

    try {
      const activeSessions = await readDocuments<ActiveUser>('activeUsers', {
        where: [
          { field: 'userId', operator: '==', value: user.uid },
          { field: 'status', operator: '==', value: 'online' },
        ],
      });

      await Promise.all(
        activeSessions.map((session) =>
          updateDocument('activeUsers', session.id, {
            lastActiveTime: Timestamp.now(),
          })
        )
      );
    } catch (error) {
      console.error('Error updating last active time:', error);
    }
  };

  // Initialize active status on mount
  useEffect(() => {
    if (user) {
      updateActiveStatus('online');
      // Clean up old sessions
      cleanupActiveSessions();

      // Update last active time periodically
      const interval = setInterval(updateLastActive, 5 * 60 * 1000); // every 5 minutes

      return () => {
        clearInterval(interval);
        // Set status to offline on unmount
        updateActiveStatus('offline');
      };
    }
  }, [user]);

  return {
    loading,
    updateMasterUserData,
    updateActiveStatus,
    getActiveUsers,
    cleanupActiveSessions,
    updateLastActive,
  };
}