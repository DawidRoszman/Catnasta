// The build this server is running. Open tabs poll it to spot a new deployment.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { buildId: process.env.NEXT_PUBLIC_BUILD_ID },
    { headers: { "Cache-Control": "no-store" } },
  );
}
