type Props = { code: string };

export default function ProvinceUnavailable({ code }: Props) {
  return (
    <section className="mx-auto max-w-4xl rounded-2xl bg-stone-100 p-8 text-center">
      <h1 className="text-2xl font-bold">Provincie {code}</h1>
      <p className="mt-2 text-stone-700">
        Deze provincie is nog niet beschikbaar. Kies een andere hondenschool of
        neem contact met ons op.
      </p>
    </section>
  );
}
