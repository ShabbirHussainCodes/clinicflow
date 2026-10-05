/**
 * Website content that is not clinic data.
 *
 * The clinic's name, address, phone, e-mail, doctors, services and opening hours live in the
 * database (edit them in the Supabase table editor, or in `supabase/seed.sql` for a fresh project).
 * Everything else a clinic wants to say on its website lives here, in plain text.
 *
 * These placeholders are filled in automatically, so the text stays correct if the database
 * changes: {clinic} {city} {locality} {phone} {email} {year}
 *
 * Leave a value empty (`null`, or `[]` for a list) to hide that part of the site.
 * Step-by-step guide: docs/CUSTOMIZE.md
 *
 * Everything below is FICTIONAL demo content for "Sanjeevani Family Clinic".
 */

export interface Testimonial {
  quote: string;
  name: string;
  /** For example "Parent of two" or "Regular patient". */
  context: string;
}

export interface Faq {
  question: string;
  answer: string;
}

export interface SiteContent {
  /** Year the clinic opened. Shown in the facts row and in {year}. */
  establishedYear: number | null;
  /** Clinic registration number as it appears on your registration certificate. */
  registration: string | null;
  hero: {
    /** `null` uses the clinic tagline from the database. */
    headline: string | null;
    /** `null` uses the clinic description from the database. */
    subheadline: string | null;
  };
  about: {
    heading: string;
    paragraphs: string[];
    facilities: string[];
  } | null;
  testimonials: Testimonial[];
  /** Small print under the testimonials. Remove (`null`) for a real clinic. */
  testimonialsNote: string | null;
  faqs: Faq[];
  cta: { heading: string; text: string };
  /** WhatsApp number in international format without "+" or spaces, e.g. "919812345678". */
  whatsapp: string | null;
  /** Public link to the clinic's map listing. `null` builds a search link from the address. */
  mapsUrl: string | null;
  /** Optional links shown in the footer, for example Instagram or Facebook. */
  social: { label: string; href: string }[];
  /** Small credit line in the footer. `null` removes it. */
  credit: string | null;
}

export const siteContent: SiteContent = {
  establishedYear: 2011,
  registration: "Registration no. 0000 (sample)",

  hero: {
    headline: "Family medicine, child health and skin care in {locality}.",
    subheadline:
      "Doctors for every age under one roof in {city}. Choose a service, pick a time that suits you and get your booking reference straight away.",
  },

  about: {
    heading: "About {clinic}",
    paragraphs: [
      "{clinic} opened in {year} as a one-doctor practice. It has grown into a small team that looks after several generations of the same families in {locality} and the neighbouring lanes.",
      "Each visit is booked for the time it needs, from 15 minutes for a follow-up to 40 minutes for a full preventive check, so nobody is racing the clock. The times you see online are the times that are free.",
      "For a first visit, please arrive about ten minutes early and bring any previous prescriptions, reports and medicines you take.",
    ],
    facilities: [
      "Ground-floor clinic with a step-free entrance",
      "Child-friendly waiting area",
      "Vaccination room with a monitored refrigerator",
      "Blood pressure, blood sugar and oxygen checks on site",
      "Printed prescriptions and vaccination cards",
    ],
  },

  testimonials: [
    {
      quote:
        "Booked at night, seen the next morning. Dr. Deshmukh was patient with my son, who usually cries at clinics.",
      name: "Aarti K.",
      context: "Parent of two",
    },
    {
      quote:
        "I like that the booking reference comes straight away. I do not have to call and wait on hold.",
      name: "Rohit D.",
      context: "Regular patient",
    },
    {
      quote:
        "Dr. Menon explained everything clearly and respectfully. The clinic is easy to reach and runs on time.",
      name: "Neha S.",
      context: "New patient",
    },
  ],
  testimonialsNote: "Sample testimonials written for this demonstration. They are fictional.",

  faqs: [
    {
      question: "Do I need an account to book?",
      answer:
        "No. You only give your name and mobile number. Your booking reference appears on screen as soon as you book.",
    },
    {
      question: "How do I know my booking is confirmed?",
      answer:
        "The booking reference on the confirmation page means your time is held. The clinic then calls you on your mobile number to confirm.",
    },
    {
      question: "Can I change or cancel my appointment?",
      answer:
        "Yes. Please call the clinic on {phone} and quote your booking reference, and the team will change it for you.",
    },
    {
      question: "What should I bring?",
      answer:
        "Any previous prescriptions and reports, and the medicines you are taking. For a child's vaccination, bring the vaccination card.",
    },
    {
      question: "Can I use online booking in an emergency?",
      answer:
        "No. Online booking is for planned visits only. In an emergency, call your local emergency number or go to the nearest hospital.",
    },
    {
      question: "What information do you collect?",
      answer:
        "Only what is needed to book: your name and mobile number, and optionally an e-mail address, age range and a short reason for the visit. We do not collect diagnoses or medical records online. Read the privacy notice for details.",
    },
  ],

  cta: {
    heading: "Book your visit online.",
    text: "Choose a doctor and a time in about a minute, or call us on {phone}.",
  },

  whatsapp: null,
  mapsUrl: null,
  social: [],
  credit: "Online booking by ClinicFlow",
};
