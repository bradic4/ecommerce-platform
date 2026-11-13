import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Uslovi kupovine, dostava, reklamacije i pravo na odustanak",
  description:
    "Informacije o trgovcu, načinu isporuke, plaćanju pouzećem, pravu potrošača na odustanak u roku od 14 dana i postupku reklamacije.",
};

export default function LegalTermsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 rounded-xl border border-slate-200 bg-white p-8 shadow-xs text-sm leading-relaxed text-slate-700">
      <div>
        <span className="rounded bg-[#0f807f] px-2.5 py-1 text-xs font-bold text-white uppercase">
          Zaštita Potrošača (Sekcija 13.3 / AT-16)
        </span>
        <h1 className="mt-3 text-2xl font-extrabold text-[#101c32]">
          Uslovi kupovine, dostava, reklamacije i pravo na odustanak
        </h1>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-[#101c32]">
          1. Identifikacioni podaci trgovca
        </h2>
        <p>
          <strong>Poslovno ime:</strong> Porodična Prodavnica Alati &amp; Domaćinstvo DOO Beograd
          <br />
          <strong>Šifra delatnosti:</strong> 4791 – Trgovina na malo posredstvom pošte ili preko interneta
          <br />
          <strong>Kontakt telefon za kupce i reklamacije:</strong> +381 11 555 0100 (radnim danima 08:00–16:00h)
          <br />
          <strong>Email za reklamacije i odustanak od ugovora:</strong> podrska@prodavnica.rs
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-[#101c32]">
          2. Cene, dostava i plaćanje pouzećem
        </h2>
        <p>
          Sve cene na sajtu iskazane su u dinarima (RSD) sa uračunatim PDV-om. Trošak isporuke kurirskom službom
          iznosi <strong>490 RSD</strong> za porudžbine ispod 12.000 RSD, dok je za porudžbine od 12.000 RSD i više
          isporuka besplatna. Plaćanje se vrši gotovinom kuriru prilikom preuzimanja pošiljke (pouzećem).
        </p>
      </section>

      <section id="odustanak" className="space-y-2">
        <h2 className="text-lg font-bold text-[#101c32]">
          3. Pravo potrošača na odustanak od ugovora na daljinu (14 dana)
        </h2>
        <p>
          U skladu sa Zakonom o zaštiti potrošača Republike Srbije, kupac (fizičko lice) ima pravo da odustane od
          ugovora zaključenog na daljinu u roku od <strong>14 dana</strong> od dana kada je roba dospela u državinu
          potrošača, bez navođenja razloga i bez dodatnih troškova, osim direktnih troškova vraćanja robe.
        </p>
        <p>
          Izjavu o odustanku možete poslati elektronskom poštom na <strong>podrska@prodavnica.rs</strong> uz navođenje
          broja porudžbine i broja tekućeg računa za povraćaj uplaćenih sredstava. Trgovac je dužan da izvrši povraćaj
          uplata najkasnije u roku od 14 dana od dana prijema izjave o odustanku, po prijemu vraćene robe ili dokaza
          da je roba poslata nazad.
        </p>
      </section>

      <section id="reklamacije" className="space-y-2">
        <h2 className="text-lg font-bold text-[#101c32]">
          4. Saobraznost robe i postupak reklamacije (24 meseca)
        </h2>
        <p>
          Trgovac odgovara za nesaobraznost isporučene robe ugovoru u roku od <strong>2 godine</strong> od dana
          prelaska rizika na potrošača. Reklamaciju možete izjaviti elektronski na{" "}
          <strong>podrska@prodavnica.rs</strong> ili telefonom, uz dostavljanje računa ili drugog dokaza o kupovini.
          Prijem reklamacije potvrđujemo bez odlaganja pisanim ili elektronskim putem uz dodelu evidencionog broja, a
          odgovor na reklamaciju dostavljamo u zakonskom roku od 8 dana.
        </p>
      </section>
    </div>
  );
}
