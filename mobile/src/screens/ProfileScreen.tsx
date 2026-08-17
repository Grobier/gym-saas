import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { authAPI, membershipsAPI } from '../lib/api';
import { useAuthStore, useGymsStore } from '../lib/store';

interface Membership {
  id: string;
  status: string;
  plan: {
    name: string;
  };
  expiresAt: string;
  classesRemaining?: number;
}

export default function ProfileScreen() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const selectedGymId = useGymsStore((state) => state.selectedGymId);

  useEffect(() => {
    fetchMemberships();
  }, [selectedGymId]);

  const fetchMemberships = async () => {
    if (!selectedGymId) return;

    try {
      const { data } = await membershipsAPI.list(selectedGymId);
      setMemberships(data);
    } catch (error) {
      console.error('Failed to fetch memberships:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.name?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Memberships</Text>
        {loading ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : memberships.length === 0 ? (
          <Text style={styles.emptyText}>No active memberships</Text>
        ) : (
          memberships.map((membership) => (
            <View key={membership.id} style={styles.membershipCard}>
              <View>
                <Text style={styles.planName}>{membership.plan.name}</Text>
                <Text style={styles.status}>
                  Status: {membership.status.toUpperCase()}
                </Text>
                {membership.classesRemaining !== undefined && (
                  <Text style={styles.classes}>
                    Classes remaining: {membership.classesRemaining}
                  </Text>
                )}
              </View>
              <Text style={styles.expiry}>
                Expires: {new Date(membership.expiresAt).toLocaleDateString()}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/settings')}
        >
          <Text style={styles.settingsButtonText}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingsButton, styles.logoutButton]}
          onPress={handleLogout}
        >
          <Text style={[styles.settingsButtonText, styles.logoutButtonText]}>
            Logout
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  membershipCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  planName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  status: {
    fontSize: 13,
    color: '#007AFF',
    marginTop: 4,
  },
  classes: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  expiry: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 16,
  },
  settingsButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
  },
  settingsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  logoutButton: {
    backgroundColor: '#ffebee',
  },
  logoutButtonText: {
    color: '#d32f2f',
  },
});
