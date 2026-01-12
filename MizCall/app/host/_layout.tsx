import { Stack } from "expo-router";

export default function HostLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="create-user" />
      <Stack.Screen name="two-factor-settings" />
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

