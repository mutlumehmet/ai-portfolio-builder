import { siteConfig, siteUrl } from "@/lib/config";

// schema.org data for search engines and AI tools: the home page is a
// ProfilePage about one Person, with the current role, education,
// certificates, skills and the profiles that are the same person (sameAs).
export function PersonJsonLd() {
  const { person, socials, seo, home } = siteConfig;
  // Certificates only; education is in alumniOf.
  const credentials = home.credentials.filter((c) => c.year && c.title !== person.alumniOf && c.issuer !== person.alumniOf);
  const data = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: siteUrl,
    name: seo.title,
    mainEntity: {
      "@type": "Person",
      "@id": `${siteUrl}/#person`,
      name: person.name,
      alternateName: person.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
      url: siteUrl,
      image: `${siteUrl}${person.photo}`,
      jobTitle: person.role,
      description: seo.description,
      ...(person.worksFor.name && {
        worksFor: { "@type": "Organization", name: person.worksFor.name, ...(person.worksFor.url && { url: person.worksFor.url }) },
      }),
      hasOccupation: {
        "@type": "Occupation",
        name: person.role,
        ...(person.location && { occupationLocation: { "@type": "City", name: person.location } }),
      },
      ...(person.alumniOf && { alumniOf: { "@type": "CollegeOrUniversity", name: person.alumniOf } }),
      hasCredential: credentials.map((c) => ({
        "@type": "EducationalOccupationalCredential",
        name: c.title,
        recognizedBy: { "@type": "Organization", name: c.issuer.split(",")[0] },
      })),
      ...(person.location && { address: { "@type": "PostalAddress", addressLocality: person.location } }),
      knowsAbout: [...new Set([...person.knowsAbout, ...home.stackOrder.slice(0, 12)])],
      sameAs: [socials.linkedin, socials.github].filter(Boolean),
      subjectOf: { "@type": "DigitalDocument", name: `${person.name} CV`, url: `${siteUrl}/cv.pdf`, encodingFormat: "application/pdf" },
    },
  };
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output with "<" escaped, so the text cannot close the script tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
