import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon: the brass paw from the site logo on the felt background. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#e3a94b",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 48 48" fill="#06150f">
          <ellipse cx="24" cy="31" rx="10.4" ry="8.8" />
          <ellipse cx="10.4" cy="20.8" rx="4.2" ry="5.2" transform="rotate(-18 10.4 20.8)" />
          <ellipse cx="18.6" cy="13.2" rx="4.4" ry="5.6" transform="rotate(-6 18.6 13.2)" />
          <ellipse cx="29.4" cy="13.2" rx="4.4" ry="5.6" transform="rotate(6 29.4 13.2)" />
          <ellipse cx="37.6" cy="20.8" rx="4.2" ry="5.2" transform="rotate(18 37.6 20.8)" />
        </svg>
      </div>
    ),
    size,
  );
}
