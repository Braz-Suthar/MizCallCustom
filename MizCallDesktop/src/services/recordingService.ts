import { API_BASE } from "../constants";
import { authFetch } from "../utils/auth";

export const recordingService = {
  // Fetch all recordings
  fetchRecordings: async (token: string) => {
    const res = await authFetch(`${API_BASE}/host/recordings`, undefined, token);
    if (!res.ok) throw new Error("Failed to fetch recordings");
    return res.json();
  },

  // Delete a recording
  deleteRecording: async (token: string, recordingId: string) => {
    const res = await authFetch(
      `${API_BASE}/host/recordings/${recordingId}`,
      { method: "DELETE" },
      token
    );
    if (!res.ok) throw new Error("Failed to delete recording");
    return res.json();
  },
};
