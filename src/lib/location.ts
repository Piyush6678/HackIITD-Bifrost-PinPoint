// One reading of the device's position, for checks like "are you near this issue?".
// Browser only.
export function currentPosition(): Promise<{ lat: number; lng: number; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("This browser can't share its location, so we can't check you're nearby."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude, accuracy: Math.round(coords.accuracy) }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? "Location is blocked. Allow it for this site so we can check you're near the issue."
              : "Couldn't get your location. Step into the open and try again.",
          ),
        ),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 20_000 },
    );
  });
}
