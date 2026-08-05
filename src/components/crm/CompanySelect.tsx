type CompanyOption = { id: string; name: string };

export function CompanySelect({
  companies,
  defaultValue,
  name = "companyId",
}: {
  companies: CompanyOption[];
  defaultValue?: string | null;
  name?: string;
}) {
  return (
    <label className="block sm:col-span-2">
      <span className="text-sm text-slate-400">Company</span>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
      >
        <option value="">No company</option>
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.name}
          </option>
        ))}
      </select>
    </label>
  );
}
