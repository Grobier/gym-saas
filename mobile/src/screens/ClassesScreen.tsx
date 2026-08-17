import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useRouter } from 'expo-router';
import { classesAPI } from '../lib/api';
import { useGymsStore } from '../lib/store';

interface Class {
  id: string;
  name: string;
  discipline: {
    name: string;
  };
  coach: {
    name: string;
  };
  startsAt: string;
  endsAt: string;
  capacity: number;
  enrolled: number;
}

export default function ClassesScreen() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const router = useRouter();
  const selectedGymId = useGymsStore((state) => state.selectedGymId);

  useEffect(() => {
    fetchClasses();
  }, [selectedDate, selectedGymId]);

  const fetchClasses = async () => {
    if (!selectedGymId) return;

    try {
      const startDate = format(startOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ss");
      const endDate = format(endOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ss");

      const { data } = await classesAPI.listByDateRange(selectedGymId, startDate, endDate);
      setClasses(data);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchClasses();
  };

  const handleClassPress = (classId: string) => {
    router.push(`/class/${classId}`);
  };

  const renderClassCard = ({ item }: { item: Class }) => {
    const startTime = format(new Date(item.startsAt), 'HH:mm');
    const endTime = format(new Date(item.endsAt), 'HH:mm');
    const spotsAvailable = item.capacity - item.enrolled;

    return (
      <TouchableOpacity
        style={styles.classCard}
        onPress={() => handleClassPress(item.id)}
      >
        <View style={styles.classHeader}>
          <Text style={styles.className}>{item.name}</Text>
          <Text style={styles.classTime}>
            {startTime} - {endTime}
          </Text>
        </View>

        <Text style={styles.classCoach}>{item.coach.name}</Text>
        <Text style={styles.classDiscipline}>{item.discipline.name}</Text>

        <View style={styles.classFooter}>
          <Text style={styles.classSpots}>
            {spotsAvailable} spots available
          </Text>
          <View
            style={[
              styles.capacityBar,
              {
                width: `${(item.enrolled / item.capacity) * 100}%`,
              },
            ]}
          />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}>
          <Text style={styles.navButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.dateText}>{format(selectedDate, 'MMM dd, yyyy')}</Text>
        <TouchableOpacity onPress={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}>
          <Text style={styles.navButton}>→</Text>
        </TouchableOpacity>
      </View>

      {classes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No classes on this date</Text>
        </View>
      ) : (
        <FlatList
          data={classes}
          renderItem={renderClassCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  navButton: {
    fontSize: 24,
    color: '#007AFF',
    paddingHorizontal: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  classCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  classHeader: {
    marginBottom: 8,
  },
  className: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  classTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  classCoach: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
  },
  classDiscipline: {
    fontSize: 13,
    color: '#999',
    marginBottom: 12,
  },
  classFooter: {
    gap: 8,
  },
  classSpots: {
    fontSize: 12,
    color: '#666',
  },
  capacityBar: {
    height: 6,
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
