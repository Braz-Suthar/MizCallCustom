import { Stack } from "expo-router";
import React from "react";

export default function UserLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen 
        name="active-call" 
        options={{
          gestureEnabled: false,  // Disable iOS swipe-back gesture
          headerBackVisible: false,  // Hide back button
        }}
      />
    </Stack>
  );
}


