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

  useEffect(() => {
    if (!hydrated) {
      dispatch(hydrateSession()).finally(() => setHydrating(false));
    } else {
      setHydrating(false);
    }
  }, [dispatch, hydrated]);

  if (hydrating || status === "loading") {
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
