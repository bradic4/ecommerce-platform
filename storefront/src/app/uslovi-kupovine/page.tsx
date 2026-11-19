import type { Metadata } from "next";
import React from "react";
import { STORE_CONFIG } from "@/lib/store-config";

export const metadata: Metadata = {
  title: "Uslovi kupovine, dostava, reklamacije i pravo na odustanak",
  description:
    "Informacije o trgovcu NaLageru.rs, načinu isporuke, plaćanju pouzećem, pravu potrošača na odustanak u roku od 14 dana i postupku reklamacije.",
};

export default function LegalTermsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-xs text-sm leading-relaxed text-slate-700">
      <div>
        <span className="rounded-md bg-brand-700 px-2.5 py-1 text-xs font-bold text-accent-400 uppercase">
          Zaštita Potrošača Republike Srbije
        </span>
        <h1 className="mt-3 text-2xl font-extrabold text-brand-700">
          Uslovi kupovine, dostava, reklamacije i pravo na odustanak
        </h1>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-brand-700">
          1. Identifikacioni podaci trgovca
        </h2>
        <p>
          <strong>Poslovno ime:</strong> {STORE_CONFIG.legalInfo.companyName}
          <br />
          <strong>Šifra delatnosti:</strong>{" "}
          {STORE_CONFIG.legalInfo.activityCode}
          <br />
          <strong>Kontakt telefon za kupce i reklamacije:</strong>{" "}
          {STORE_CONFIG.supportPhoneDisplay} ({STORE_CONFIG.workingHours})
          <br />
          <strong>Email za reklamacije i odustanak od ugovora:</strong>{" "}
          {STORE_CONFIG.supportEmail}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold text-brand-700">
          2. Cene, status lagera, dostava i plaćanje
        </h2>
        <p>
          Sve cene na sajtu <strong>{STORE_CONFIG.domain}</strong> iskazane su u
          dinarima (RSD) sa uračunatim PDV-om. Za svaki proizvod jasno je
          istaknut izvor isporuke: artikli sa oznakom{" "}
          <strong>Naš lager (1–2 radna dana)</strong> otpremaju se direktno iz
          našeg magacina, dok se artikli sa oznakom{" "}
          <strong>Lager dobavljača (2–5 radnih dana)</strong> isporučuju po
          potvrdi rezervacije kod uvoznika.
        </p>
        <p>
          Trošak isporuke kurirskom službom iznosi <strong>490 RSD</strong> za
          porudžbine ispod 12.000 RSD, dok je za porudžbine od 12.000 RSD i više
          isporuka besplatna. Plaćanje se vrši gotovinom kuriru prilikom
          preuzimanja pošiljke (pouzećem) ili instant NBS IPS QR nalogom.
        </p>
      </section>

      <section id="odustanak" className="space-y-2">
        <h2 className="text-lg font-bold text-brand-700">
          3. Pravo potrošača na odustanak od ugovora na daljinu (14 dana)
        </h2>
        <p>
          U skladu sa Zakonom o zaštiti potrošača Republike Srbije, kupac
          (fizičko lice) ima pravo da odustane od ugovora zaključenog na daljinu
          u roku od <strong>14 dana</strong> od dana kada je roba dospela u
          državinu potrošača, bez navođenja razloga i bez dodatnih troškova,
          osim direktnih troškova vraćanja robe.
        </p>
        <p>
          Izjavu o odustanku možete podneti online na stranici{" "}
          <strong>/reklamacije</strong> ili poslati elektronskom poštom na{" "}
          <strong>{STORE_CONFIG.supportEmail}</strong> uz navođenje broja
          porudžbine i broja tekućeg računa za povraćaj uplaćenih sredstava.
        </p>
      </section>

      <section id="reklamacije" className="space-y-2">
        <h2 className="text-lg font-bold text-brand-700">
          4. Saobraznost robe i postupak reklamacije (24 meseca)
        </h2>
        <p>
          Trgovac odgovara za nesaobraznost isporučene robe ugovoru u roku od{" "}
          <strong>2 godine (24 meseca)</strong> od dana prelaska rizika na
          potrošača. Reklamaciju možete izjaviti elektronski na{" "}
          <strong>/reklamacije</strong>, emailom na{" "}
          <strong>{STORE_CONFIG.supportEmail}</strong> ili telefonom, uz
          dostavljanje fiskalnog računa. Prijem reklamacije potvrđujemo bez
          odlaganja elektronskim putem uz dodelu evidencionog RMA broja, a
          odgovor na reklamaciju dostavljamo u zakonskom roku od{" "}
          <strong>8 dana</strong>.
        </p>
      </section>
    </div>
  );
}
