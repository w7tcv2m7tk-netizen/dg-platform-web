const RESOURCES = [
  {
    section: "Platform Overview",
    items: [
      { title: "DigitalGate Platform Overview", description: "What the platform does and who it's for." },
      { title: "Founding Customer Programme", description: "The Founding 10 commercial terms and programme structure." },
      { title: "Who DigitalGate Is For", description: "Target customers, industries, and use cases." },
    ],
  },
  {
    section: "Industry Guides",
    items: [
      { title: "Real Estate", description: "How DigitalGate works for real estate agencies and agents." },
      { title: "Accommodation", description: "Hospitality businesses — short stays, property management." },
      { title: "AI Visibility", description: "The AI Visibility App and what it does for businesses." },
      { title: "Appraisal Magnet System", description: "How the Appraisal Magnet drives vendor lead generation." },
    ],
  },
  {
    section: "Referral Resources",
    items: [
      { title: "Referral Messaging", description: "How to introduce DigitalGate to a business contact." },
      { title: "Email Template", description: "A ready-to-send introduction email for warm referrals." },
      { title: "Social Post / Template", description: "Social media copy for sharing your referral link." },
      { title: "Platform Consultation", description: "What happens in the Platform Consultation and what to expect." },
    ],
  },
];

export default function PartnerResourcesPage() {
  return (
    <div className="max-w-3xl space-y-10">
      <p className="text-sm text-slate-400">
        These resources will help you introduce DigitalGate to the right businesses. If you need
        anything specific,{" "}
        <a href="mailto:hello@digitalgate.com.au" className="text-sky-400 hover:underline">
          contact Ben directly
        </a>.
      </p>

      {RESOURCES.map((section) => (
        <div key={section.section}>
          <h2 className="mb-4 text-base font-semibold text-white">{section.section}</h2>
          <div className="space-y-3">
            {section.items.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-5 py-4"
              >
                <p className="font-medium text-white">{item.title}</p>
                <p className="mt-0.5 text-sm text-slate-400">{item.description}</p>
                <p className="mt-2 text-xs text-slate-600">Coming soon — contact Ben for a copy.</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
