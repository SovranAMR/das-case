export type FormalTerm = {
  term: string;
  definition: string;
};

export const FORMAL_TERMS: FormalTerm[] = [
  {
    term: "Kanuni süre",
    definition: "Kanun veya mahkeme kararıyla belirlenen, kaçırılamayan işlem süresi.",
  },
  {
    term: "Duruşma",
    definition: "Mahkemenin tarafları dinlediği ve dosyayı değerlendirdiği resmi oturum.",
  },
  {
    term: "Aşama",
    definition: "Dosyanın süreç içindeki mevcut hukuki konumu (ör. dilekçe, bilirkişi, karar).",
  },
  {
    term: "Tebliğ",
    definition: "Bir belgenin veya kararın taraflara resmi olarak iletilmesi.",
  },
  {
    term: "Esas no",
    definition: "Mahkemenin dosyaya verdiği yıl/sıra numarası.",
  },
];
