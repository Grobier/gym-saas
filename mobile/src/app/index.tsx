import { Text, View } from 'react-native';
import React from 'react';

export default function HomeScreen(): JSX.Element {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Gym SaaS Mobile</Text>
      <Text style={{ marginTop: 10 }}>Phase 1: Scaffolding in progress</Text>
      <Text style={{ marginTop: 5, color: '#666' }}>
        Full app coming in Phase 8...
      </Text>
    </View>
  );
}
