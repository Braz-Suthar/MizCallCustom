import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import { View } from "react-native";

import { hydrateSession } from "../state/authActions";
import { useAppDispatch, useAppSelector } from "../state/store";
import { SplashScreen } from "../components/SplashScreen";

export default function Index() {
  const dispatch = useAppDispatch();
  const { status, role, token, hydrated } = useAppSelector((s) => s.auth);
  const [hydrating, setHydrating] = useState(true);
  const [minSplashTime, setMinSplashTime] = useState(true);

  useEffect(() => {
    // Ensure splash screen shows for minimum 3 seconds
    const timer = setTimeout(() => {
      setMinSplashTime(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      dispatch(hydrateSession()).finally(() => setHydrating(false));
    } else {
      setHydrating(false);
    }
  }, [dispatch, hydrated]);

  // Show splash screen until both hydration is done AND 3 seconds have passed
  if (hydrating || status === "loading" || minSplashTime) {
    return (
      <View style={{ flex: 1 }}>
        <SplashScreen />
      </View>
    );
  }

  if (status === "authenticated" && token && role === "host") {
    return <Redirect href="/host/dashboard" />;
  }

  if (status === "authenticated" && token && role === "user") {
    return <Redirect href="/user/dashboard" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}
