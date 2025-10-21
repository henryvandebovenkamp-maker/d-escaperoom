// PATH: src/app/partner/provincie/dr/page.tsx
import Header from "@/components/Header";
import ProvinceUnavailable from "@/app/provincie/_components/ProvinceUnavailable";

export const dynamic = "force-static";

export default function Page() {
  return (
    <>
      <Header />
      <div className="bg-stone-50 min-h-dvh">
        <ProvinceUnavailable code="DR" />
      </div>
    </>
  );
}
