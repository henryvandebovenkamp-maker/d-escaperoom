export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SuccessTest({ params }: { params: { bookingId: string } }) {
  return (
    <main style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui" }}>
      <h1>SUCCESS OK</h1>
      <p>bookingId = <code>{params.bookingId}</code></p>
    </main>
  );
}
