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
      <Stack.Screen name="active-call" />
    </Stack>
  );
}


