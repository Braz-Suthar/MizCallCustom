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
    </Stack>
  );
}

